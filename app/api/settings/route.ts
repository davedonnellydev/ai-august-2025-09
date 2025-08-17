import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth';
import { db, userSettingsTable, usersTable } from '../../db';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user settings
    const [userSettings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);

    if (!userSettings) {
      // Return default settings if none exist
      return NextResponse.json({
        watchedLabelIds: [],
        cronFrequencyMinutes: 1440,
        customInstructions: '',
      });
    }

    return NextResponse.json({
      watchedLabelIds: userSettings.watchedLabelIds,
      cronFrequencyMinutes: userSettings.cronFrequencyMinutes,
      customInstructions: userSettings.customInstructions || '',
    });
  } catch (error) {
    // Log error for debugging but don't expose in response
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { watchedLabelIds, cronFrequencyMinutes, customInstructions } = body;

    // Validate input
    if (!Array.isArray(watchedLabelIds)) {
      return NextResponse.json(
        { error: 'watchedLabelIds must be an array' },
        { status: 400 }
      );
    }

    if (
      typeof cronFrequencyMinutes !== 'number' ||
      cronFrequencyMinutes < 15 ||
      cronFrequencyMinutes > 1440
    ) {
      return NextResponse.json(
        { error: 'cronFrequencyMinutes must be between 15 and 1440' },
        { status: 400 }
      );
    }

    if (typeof customInstructions !== 'string') {
      return NextResponse.json(
        { error: 'customInstructions must be a string' },
        { status: 400 }
      );
    }

    // Ensure user exists
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upsert user settings
    const [updatedSettings] = await db
      .insert(userSettingsTable)
      .values({
        userId,
        watchedLabelIds,
        cronFrequencyMinutes,
        customInstructions: customInstructions || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: {
          watchedLabelIds,
          cronFrequencyMinutes,
          customInstructions: customInstructions || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        watchedLabelIds: updatedSettings.watchedLabelIds,
        cronFrequencyMinutes: updatedSettings.cronFrequencyMinutes,
        customInstructions: updatedSettings.customInstructions || '',
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
