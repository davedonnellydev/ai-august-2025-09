import {
  db,
  jobLeadUrlsTable,
  extractionJobsTable,
  userSettingsTable,
} from '../../db';
import { eq, and } from 'drizzle-orm';
import { extractJobLeads } from '../extraction/extractJobLeads';
import { extractLinks, normalizeUrl } from './normalize';
import { LeadStatus } from '../types/leads';

export interface LeadExtractionResult {
  emailsProcessed: number;
  leadsInserted: number;
  dedupedByUrl: number;
  duplicatesFlagged: number;
  errors: string[];
}

/**
 * Extract and insert job leads from an email
 */
export async function extractAndInsertLeads(
  userId: string,
  emailId: string,
  emailText: string,
  emailHtml?: string,
  sourceLabelId?: string
): Promise<{
  leadsInserted: number;
  dedupedByUrl: number;
  duplicatesFlagged: number;
  extractionJobId: string;
}> {
  let leadsInserted = 0;
  let dedupedByUrl = 0;
  let duplicatesFlagged = 0;

  let customInstructions: string | undefined;

  try {
    // Get user's custom instructions
    const [userSettings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);

    customInstructions = userSettings?.customInstructions || undefined;

    // Extract links from email content
    const extractedLinks = extractLinks({
      html: emailHtml,
      text: emailText,
    });

    // Convert to format expected by extractJobLeads
    const rawLinks = extractedLinks.map((link) => ({
      url: link.url,
      anchorText: link.anchorText,
    }));

    // Call OpenAI extraction
    const extractionResult = await extractJobLeads({
      emailText,
      rawLinks,
      customInstructions,
      userId,
      emailId,
    });

    // Create extraction job record
    const [extractionJob] = await db
      .insert(extractionJobsTable)
      .values({
        userId,
        emailId,
        status: 'succeeded',
        model: 'gpt-4.1-mini', // Default model
        promptVersion: 'v1',
        instructionsSnapshot: customInstructions,
        output: extractionResult.leads,
        tokensPrompt: extractionResult.tokens.input,
        tokensCompletion: extractionResult.tokens.output,
      })
      .returning();

    // Process each extracted lead
    for (const lead of extractionResult.leads) {
      try {
        // Normalize URL again (same helper)
        const normalizedUrl = normalizeUrl(lead.url);

        // Check if (userId, normalizedUrl) already exists
        const existingLead = await db
          .select()
          .from(jobLeadUrlsTable)
          .where(
            and(
              eq(jobLeadUrlsTable.userId, userId),
              eq(jobLeadUrlsTable.normalizedUrl, normalizedUrl)
            )
          )
          .limit(1);

        if (existingLead.length > 0) {
          // Skip - already exists
          dedupedByUrl++;
          continue;
        }

        // Check if dedupeKey matches existing lead for user
        if (lead.dedupeKey) {
          const duplicateLead = await db
            .select()
            .from(jobLeadUrlsTable)
            .where(
              and(
                eq(jobLeadUrlsTable.userId, userId),
                eq(jobLeadUrlsTable.canonicalJobKey, lead.dedupeKey)
              )
            )
            .limit(1);

          if (duplicateLead.length > 0) {
            // Insert as duplicate
            await db.insert(jobLeadUrlsTable).values({
              userId,
              emailId,
              extractionJobId: extractionJob.id,
              status: 'duplicate' as LeadStatus,
              url: lead.url,
              normalizedUrl,
              type: lead.type,
              title: lead.title,
              company: lead.company,
              location: lead.location,
              canonicalJobKey: lead.dedupeKey,
              anchorText: lead.anchorText,
              sourceLabelId,
              confidence: lead.confidence.toString(),
            });

            duplicatesFlagged++;
            continue;
          }
        }

        // Insert new lead
        await db.insert(jobLeadUrlsTable).values({
          userId,
          emailId,
          extractionJobId: extractionJob.id,
          status: 'new' as LeadStatus,
          url: lead.url,
          normalizedUrl,
          type: lead.type,
          title: lead.title,
          company: lead.company,
          location: lead.location,
          canonicalJobKey: lead.dedupeKey,
          anchorText: lead.anchorText,
          sourceLabelId,
          confidence: lead.confidence.toString(),
        });

        leadsInserted++;
      } catch (error) {
        console.error(`Error processing lead ${lead.url}:`, error);
        // Continue with other leads
      }
    }

    return {
      leadsInserted,
      dedupedByUrl,
      duplicatesFlagged,
      extractionJobId: extractionJob.id,
    };
  } catch (error) {
    console.error('Error in lead extraction:', error);

    // Create failed extraction job record
    const [_extractionJob] = await db
      .insert(extractionJobsTable)
      .values({
        userId,
        emailId,
        status: 'failed',
        model: 'gpt-4.1-mini',
        promptVersion: 'v1',
        instructionsSnapshot: customInstructions,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .returning();

    throw new Error(`Failed to extract leads: ${error}`);
  }
}
