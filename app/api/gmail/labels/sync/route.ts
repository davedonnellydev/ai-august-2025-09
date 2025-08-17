import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db, gmailLabelsCacheTable, gmailTokensTable } from '../../../../db';
import { eq } from 'drizzle-orm';
import { getGmail, refreshGmailTokens } from '../../../../lib/google/gmailClient';

export async function POST(_request: NextRequest) {
  let session;
  try {
    // Get current user session
    session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Starting Gmail labels sync for user:', userId);

    // Check if user has Gmail tokens
    const [gmailToken] = await db
      .select()
      .from(gmailTokensTable)
      .where(eq(gmailTokensTable.userId, userId))
      .limit(1);

    if (!gmailToken) {
      console.log('No Gmail tokens found for user:', userId);
      return NextResponse.json(
        {
          error:
            'Gmail not connected. Please connect your Gmail account first.',
        },
        { status: 400 }
      );
    }

    console.log('Found Gmail tokens for user:', userId, {
      hasAccessToken: !!gmailToken.accessToken,
      hasRefreshToken: !!gmailToken.refreshToken,
      scope: gmailToken.scope,
      accessTokenLength: gmailToken.accessToken?.length || 0,
      refreshTokenLength: gmailToken.refreshToken?.length || 0,
    });

    // Get Gmail client
    console.log('Getting Gmail client for user:', userId);
    let gmail;
    
    try {
      gmail = await getGmail(userId);
      console.log('Gmail client obtained successfully');
      
      // Verify the Gmail service has authentication
      console.log('Verifying Gmail service authentication...');
      const auth = (gmail as any).context._options?.auth;
      console.log('Gmail service auth object:', {
        hasAuth: !!auth,
        authType: auth?.constructor?.name,
        hasCredentials: !!auth?.credentials,
        credentialsKeys: auth?.credentials ? Object.keys(auth.credentials) : [],
      });
      
    } catch (error) {
      // If it's a token error, try to refresh tokens
      if (error instanceof Error && 
          (error.message.includes('invalid_grant') || 
           error.message.includes('token') ||
           error.message.includes('expired'))) {
        
        console.log('Attempting to refresh tokens for user:', userId);
        try {
          await refreshGmailTokens(userId);
          gmail = await getGmail(userId);
          console.log('Gmail client obtained after token refresh');
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          return NextResponse.json(
            { error: 'Gmail access token expired and refresh failed. Please reconnect your Gmail account.' },
            { status: 401 }
          );
        }
      } else {
        throw error;
      }
    }

    // Fetch labels from Gmail
    console.log('Fetching labels from Gmail API');
    console.log('Gmail service object:', {
      hasGmail: !!gmail,
      gmailType: gmail?.constructor?.name,
      hasUsers: !!gmail?.users,
      hasLabels: !!gmail?.users?.labels,
    });
    
    const labelsResponse = await gmail.users.labels.list({
      userId: 'me',
    });

    const labels = labelsResponse.data.labels || [];
    console.log('Retrieved labels from Gmail:', labels.length);

    if (labels.length === 0) {
      console.log('No labels found in Gmail');
      return NextResponse.json({
        message: 'No labels found',
        synced: 0,
      });
    }

    // Clear existing cached labels for this user
    console.log('Clearing existing cached labels for user:', userId);
    await db
      .delete(gmailLabelsCacheTable)
      .where(eq(gmailLabelsCacheTable.userId, userId));

    // Insert new labels into cache
    const labelsToInsert = labels.map((label) => ({
      userId,
      providerLabelId: label.id!,
      name: label.name!,
      type: label.type || 'user',
    }));

    console.log('Inserting labels into cache:', labelsToInsert.length);
    if (labelsToInsert.length > 0) {
      await db.insert(gmailLabelsCacheTable).values(labelsToInsert);
    }

    console.log('Labels sync completed successfully for user:', userId);
    return NextResponse.json({
      message: 'Labels synced successfully',
      synced: labelsToInsert.length,
      labels: labelsToInsert.map((label) => ({
        id: label.providerLabelId,
        name: label.name,
        type: label.type,
      })),
    });
  } catch (error) {
    // Log detailed error for debugging
    console.error('Gmail labels sync error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id || 'unknown',
    });

    // Return more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || error.message.includes('token')) {
        return NextResponse.json(
          { error: 'Gmail access token expired. Please reconnect your Gmail account.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return NextResponse.json(
          { error: 'Gmail API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Network error connecting to Gmail. Please check your connection and try again.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('authentication') || error.message.includes('credential')) {
        return NextResponse.json(
          { error: 'Gmail authentication failed. Please reconnect your Gmail account.' },
          { status: 401 }
        );
      }
    }

    // Generic error for unknown issues
    return NextResponse.json(
      { error: 'Failed to sync labels. Please try again.' },
      { status: 500 }
    );
  }
}
