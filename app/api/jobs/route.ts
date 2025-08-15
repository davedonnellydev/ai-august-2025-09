import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, jobListingsTable } from '@/app/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    const jobListings = await db.query.jobListingsTable.findMany({
      where: eq(jobListingsTable.userId, userId),
      with: {
        company: true,
      },
      orderBy: (jobListings, { desc }) => [desc(jobListings.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: jobListings,
    });
  } catch (error) {
    console.error('Error fetching job listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch job listings',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
        emailId,
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
        tags,
        confidence
      } = body;

    // Validate required fields
    if (!title || !location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title and location are required',
        },
        { status: 400 }
      );
    }

    // Check for duplicate job listing (user + url combination should be unique)
    if (applyUrl) {
      const existingJob = await db.query.jobListingsTable.findFirst({
        where: and(
          eq(jobListingsTable.userId, userId),
          eq(jobListingsTable.applyUrl, applyUrl)
        ),
      });

      if (existingJob) {
        return NextResponse.json(
          {
            success: false,
            error: 'A job with this URL already exists for this user',
          },
          { status: 409 }
        );
      }
    }

    // Create the job listing
    const [newJob] = await db
      .insert(jobListingsTable)
      .values({
        userId,
        emailId,
        company,
        title,
        location,
        workMode,
        employmentType,
        seniority,
        salaryMin: salaryMin ? salaryMin.toString() : undefined,
        salaryMax: salaryMax ? salaryMax.toString() : undefined,
        currency,
        applyUrl,
        description,
        status: 'new',
        tags,
        confidence
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newJob,
      message: 'Job created successfully',
    });
  } catch (error) {
    console.error('Error creating job listing:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create job listing',
      },
      { status: 500 }
    );
  }
}
