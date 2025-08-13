import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '@/app/db/schema';

const db = drizzle(process.env.DATABASE_URL!, { schema });

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
      where: eq(schema.jobListingsTable.userId, userId),
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
