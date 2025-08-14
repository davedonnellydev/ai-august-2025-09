import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, jobListingsTable, companiesTable } from '@/app/db';

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
      title,
      location,
      workMode,
      employmentType,
      seniority,
      salaryMin,
      salaryMax,
      currency,
      url,
      description,
      companyName,
      companyWebsite,
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
    if (url) {
      const existingJob = await db.query.jobListingsTable.findFirst({
        where: and(
          eq(jobListingsTable.userId, userId),
          eq(jobListingsTable.url, url)
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

    // Handle company creation/retrieval
    let companyId: string | undefined;
    if (companyName) {
      // Check if company already exists
      const existingCompany = await db.query.companiesTable.findFirst({
        where: and(
          eq(companiesTable.name, companyName),
          companyWebsite
            ? eq(companiesTable.website, companyWebsite)
            : undefined
        ),
      });

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Create new company
        const [newCompany] = await db
          .insert(companiesTable)
          .values({
            name: companyName,
            website: companyWebsite,
            location,
          })
          .returning();
        companyId = newCompany.id;
      }
    }

    // Create the job listing
    const [newJob] = await db
      .insert(jobListingsTable)
      .values({
        userId,
        companyId,
        source: 'manual',
        title,
        location,
        workMode,
        employmentType,
        seniority,
        salaryMin: salaryMin ? salaryMin.toString() : undefined,
        salaryMax: salaryMax ? salaryMax.toString() : undefined,
        currency,
        url,
        description,
        decision: 'undecided',
        status: 'new',
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
