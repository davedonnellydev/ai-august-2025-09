import { NextRequest, NextResponse } from 'next/server';
import { listMessageIdsByLabel } from '../../../lib/google/fetchMessages';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label') || 'INBOX';
    const max = parseInt(searchParams.get('max') || '10', 10);
    const q = searchParams.get('q') || undefined;
    
    // For testing, hardcode the user ID as requested in the previous implementation
    const userId = '2d30743e-10cb-4490-933c-4ccdf37364e9';

    // Label id: Label_969329089524850868

    console.log('Debug list request:', {
      label,
      max,
      q,
      userId,
    });

    // Validate max results to prevent abuse
    const maxResults = Math.min(Math.max(max, 1), 50);

    const messages = await listMessageIdsByLabel({
      userId,
      label,
      maxResults,
      q,
    });

    // Extract relevant metadata for the response
    const messageMetadata = messages.map(msg => ({
      id: msg.id,
      threadId: msg.threadId,
      internalDate: msg.internalDate,
      snippet: msg.snippet,
      labelIds: msg.labelIds,
    }));

    console.log(`Found ${messages.length} messages for label "${label}"`);

    return NextResponse.json({
      success: true,
      label,
      maxResults,
      query: q,
      messageCount: messages.length,
      messages: messageMetadata,
    });
  } catch (error) {
    console.error('Debug list error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
