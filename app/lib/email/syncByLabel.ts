import { getGmail } from '../google/gmailClient';
import { extractPlainText, cleanHtml, hashMessage } from './normalize';
import { upsertEmailMessage } from './upsert';
import { extractAndInsertLeads } from './leadExtraction';
import { extractMessageData, extractHtmlFromPayload } from './shared';
import { upsertSyncState } from './syncState';

export interface SyncByLabelOptions {
  userId: string;
  label: string;
  maxFetch?: number;
}

export interface SyncSummary {
  scanned: number;
  inserted: number;
  updated: number;
  leadsInserted: number;
  dedupedByUrl: number;
  duplicatesFlagged: number;
  errors: string[];
}

/**
 * Sync Gmail messages by label
 */
export async function syncByLabel({
  userId,
  label,
  maxFetch = 20,
}: SyncByLabelOptions): Promise<SyncSummary> {
  const summary: SyncSummary = {
    scanned: 0,
    inserted: 0,
    updated: 0,
    leadsInserted: 0,
    dedupedByUrl: 0,
    duplicatesFlagged: 0,
    errors: [],
  };

  try {
    const gmail = await getGmail(userId);

    // Step 1: List message IDs by label
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [label],
      maxResults: maxFetch,
    });

    const messageIds = listResponse.data.messages || [];
    summary.scanned = messageIds.length;

    if (messageIds.length === 0) {
      return summary;
    }

    // Step 2: Process each message
    for (const messageRef of messageIds) {
      try {
        const messageId = messageRef.id;
        if (!messageId) {
          continue;
        }

        // Fetch full message
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const message = messageResponse.data;
        if (!message.payload) {
          continue;
        }

        // Step 3: Extract header fields
        const headerData = extractMessageData(message);

        // Step 4: Build body content
        const bodyText = extractPlainText(message.payload as any);
        const bodyHtmlRaw = extractHtmlFromPayload(message.payload);

        // Clean HTML if present (for storage)
        let cleanedHtml: string | undefined;
        if (bodyHtmlRaw) {
          try {
            cleanedHtml = cleanHtml(
              Buffer.from(bodyHtmlRaw, 'base64').toString()
            );
          } catch (error) {
            console.warn('Failed to clean HTML:', error);
          }
        }

        // Extract snippet
        const snippet = message.snippet || '';

        // Step 5: Compute message hash
        const messageHash = hashMessage({
          from: headerData.fromEmail,
          subject: headerData.subject,
          sentAt: new Date(headerData.internalDate).toISOString(),
          bodyText: bodyText || '',
        });

        // Step 6: Upsert email message
        const emailMessage = await upsertEmailMessage({
          userId,
          provider: 'gmail',
          providerMessageId: messageId,
          providerThreadId: message.threadId || '',
          fromEmail: headerData.fromEmail,
          fromName: headerData.fromName,
          toEmails: headerData.toEmails,
          ccEmails: headerData.ccEmails,
          subject: headerData.subject,
          snippet,
          sentAt: new Date(headerData.internalDate),
          receivedAt: new Date(headerData.internalDate),
          bodyText,
          bodyHtml: cleanedHtml,
          messageHash,
          parseStatus: 'parsed',
        });

        // Track insert vs update
        if (
          emailMessage.createdAt.getTime() === emailMessage.updatedAt.getTime()
        ) {
          summary.inserted++;
        } else {
          summary.updated++;
        }

        // Step 7: Extract and insert job leads
        if (bodyText || bodyHtmlRaw) {
          try {
            const leadResult = await extractAndInsertLeads(
              userId,
              emailMessage.id,
              bodyText || '',
              bodyHtmlRaw
                ? Buffer.from(bodyHtmlRaw, 'base64').toString()
                : undefined,
              label
            );

            summary.leadsInserted += leadResult.leadsInserted;
            summary.dedupedByUrl += leadResult.dedupedByUrl;
            summary.duplicatesFlagged += leadResult.duplicatesFlagged;
          } catch (error) {
            const errorMsg = `Failed to extract leads from message ${messageId}: ${error}`;
            console.error(errorMsg);
            summary.errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process message ${messageRef.id}: ${error}`;
        console.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }

    // Step 8: Update sync state on success
    await upsertSyncState(userId, {
      mode: 'manual',
      watchedLabelIds: [label],
      finishedAt: new Date(),
      scanned: summary.scanned,
      newEmails: summary.inserted,
      jobsCreated: summary.leadsInserted,
      jobsUpdated: summary.updated,
      errors: summary.errors.length,
    });
  } catch (error) {
    const errorMsg = `Sync failed: ${error}`;
    console.error(errorMsg);
    summary.errors.push(errorMsg);
  }

  return summary;
}
