import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, jobListingsTable } from '@/app/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id: jobId } = await params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'jobId is required',
        },
        { status: 400 }
      );
    }

    const jobListing = await db.query.jobListingsTable.findFirst({
      where: and(
        eq(jobListingsTable.id, jobId),
        eq(jobListingsTable.userId, userId)
      ),
      with: {
        company: true,
      },
    });

    if (!jobListing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: jobListing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch job listing',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id: jobId } = await params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'jobId is required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      location,
      workMode,
      employmentType,
      seniority,
      salaryMin,
      salaryMax,
      currency,
      applyUrl,
      description,
      company,
      status,
    } = body;

    // Check if job exists and belongs to user
    const existingJob = await db.query.jobListingsTable.findFirst({
      where: and(
        eq(jobListingsTable.id, jobId),
        eq(jobListingsTable.userId, userId)
      ),
    });

    if (!existingJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found or access denied',
        },
        { status: 404 }
      );
    }

    // For partial updates, use existing values if not provided
    const updateData = {
      title: title || existingJob.title,
      company: company || existingJob.company,
      location: location || existingJob.location,
      workMode: workMode || existingJob.workMode,
      employmentType: employmentType || existingJob.employmentType,
      seniority: seniority || existingJob.seniority,
      salaryMin: salaryMin || existingJob.salaryMin,
      salaryMax: salaryMax || existingJob.salaryMax,
      currency: currency || existingJob.currency,
      applyUrl: applyUrl || existingJob.applyUrl,
      description: description || existingJob.description,
      status: status || existingJob.status,
    };

    // Validate required fields
    if (!updateData.title || !updateData.location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title and location are required',
        },
        { status: 400 }
      );
    }

    // Check for duplicate job listing (user + url combination should be unique)
    if (applyUrl && applyUrl !== existingJob.applyUrl) {
      const duplicateJob = await db.query.jobListingsTable.findFirst({
        where: and(
          eq(jobListingsTable.userId, userId),
          eq(jobListingsTable.applyUrl, applyUrl)
        ),
      });

      if (duplicateJob) {
        return NextResponse.json(
          {
            success: false,
            error: 'A job with this URL already exists for this user',
          },
          { status: 409 }
        );
      }
    }

    // Update the job listing
    const [updatedJob] = await db
      .update(jobListingsTable)
      .set({
        title: updateData.title,
        location: updateData.location,
        workMode: updateData.workMode,
        employmentType: updateData.employmentType,
        seniority: updateData.seniority,
        salaryMin: updateData.salaryMin
          ? updateData.salaryMin.toString()
          : undefined,
        salaryMax: updateData.salaryMax
          ? updateData.salaryMax.toString()
          : undefined,
        currency: updateData.currency,
        applyUrl: updateData.applyUrl,
        description: updateData.description,
        status: updateData.status,
        updatedAt: new Date(),
      })
      .where(
        and(eq(jobListingsTable.id, jobId), eq(jobListingsTable.userId, userId))
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: 'Job updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update job listing',
      },
      { status: 500 }
    );
  }
}
