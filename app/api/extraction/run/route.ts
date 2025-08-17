import { NextRequest, NextResponse } from 'next/server';
import { extractJobLeads } from '../../../lib/extraction/extractJobLeads';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailText, rawLinks, customInstructions, userId, emailId } = body;

    // Validate required fields
    if (!emailText || !rawLinks || !userId || !emailId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields. Required: emailText, rawLinks, userId, emailId',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(rawLinks)) {
      return NextResponse.json(
        { error: 'rawLinks must be an array' },
        { status: 400 }
      );
    }

    // Validate each link has required structure
    for (const link of rawLinks) {
      if (!link.url || typeof link.url !== 'string') {
        return NextResponse.json(
          { error: 'Each link must have a valid url string' },
          { status: 400 }
        );
      }
    }

    console.log('Starting job lead extraction:', {
      userId,
      emailId,
      linkCount: rawLinks.length,
      hasCustomInstructions: !!customInstructions,
    });

    // Run extraction
    const result = await extractJobLeads({
      emailText,
      rawLinks,
      customInstructions,
      userId,
      emailId,
    });

    console.log('Extraction completed:', {
      leadsFound: result.leads.length,
      tokensUsed: result.tokens,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully extracted ${result.leads.length} job leads`,
    });
  } catch (error) {
    console.error('Extraction API error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to extract job leads',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Job Lead Extraction API',
    usage: {
      method: 'POST',
      body: {
        emailText: 'string - Email content to analyze',
        rawLinks:
          'Array<{url: string, anchorText?: string}> - Links found in email',
        customInstructions: 'string? - Optional custom extraction rules',
        userId: 'string - User ID for tracking',
        emailId: 'string - Email ID for tracking',
      },
      example: {
        emailText: 'We have a great opportunity for a Frontend Developer...',
        rawLinks: [
          {
            url: 'https://company.com/jobs/frontend-dev',
            anchorText: 'Apply Now',
          },
          { url: 'https://company.com/careers', anchorText: 'See All Jobs' },
        ],
        customInstructions: 'Focus on engineering roles only',
        userId: 'user-123',
        emailId: 'email-456',
      },
    },
  });
}
