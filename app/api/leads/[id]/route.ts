import { NextRequest, NextResponse } from 'next/server';
import { db, jobLeadUrlsTable } from '../../../db';
import { getCurrentUserId } from '../../../lib/auth/session';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;

    // Get lead if owned by current user
    const [lead] = await db
      .select({
        id: jobLeadUrlsTable.id,
        url: jobLeadUrlsTable.url,
        type: jobLeadUrlsTable.type,
        title: jobLeadUrlsTable.title,
        company: jobLeadUrlsTable.company,
        location: jobLeadUrlsTable.location,
        seniority: jobLeadUrlsTable.seniority,
        employmentType: jobLeadUrlsTable.employmentType,
        workMode: jobLeadUrlsTable.workMode,
        status: jobLeadUrlsTable.status,
        canonicalJobKey: jobLeadUrlsTable.canonicalJobKey,
        anchorText: jobLeadUrlsTable.anchorText,
        sourceLabelId: jobLeadUrlsTable.sourceLabelId,
        firstSeenAt: jobLeadUrlsTable.firstSeenAt,
        tags: jobLeadUrlsTable.tags,
        confidence: jobLeadUrlsTable.confidence,
        createdAt: jobLeadUrlsTable.createdAt,
        updatedAt: jobLeadUrlsTable.updatedAt,
      })
      .from(jobLeadUrlsTable)
      .where(
        and(
          eq(jobLeadUrlsTable.id, leadId),
          eq(jobLeadUrlsTable.userId, userId)
        )
      );

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    // Log error for debugging but don't expose in response
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    const body = await request.json();
    const { status } = body;

    // Validate status enum
    const validStatuses = [
      'new',
      'undecided',
      'added_to_huntr',
      'rejected',
      'duplicate',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Update lead status if owned by current user
    const [updatedLead] = await db
      .update(jobLeadUrlsTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobLeadUrlsTable.id, leadId),
          eq(jobLeadUrlsTable.userId, userId)
        )
      )
      .returning({
        id: jobLeadUrlsTable.id,
        status: jobLeadUrlsTable.status,
        updatedAt: jobLeadUrlsTable.updatedAt,
      });

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
