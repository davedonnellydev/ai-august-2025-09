import { getGmail } from '../google/gmailClient';
import { extractPlainText, extractLinks, hashMessage } from './normalize';
import { upsertEmailMessage, upsertEmailLinks } from './upsert';
import {
  extractMessageData,
  calculateJobSignalScore,
  extractHtmlFromPayload,
} from './shared';
import { gmail_v1 } from 'googleapis';

export interface SyncByLabelOptions {
  userId: string;
  label: string;
  maxFetch?: number;
}

export interface SyncSummary {
  scanned: number;
  inserted: number;
  updated: number;
  linksCreated: number;
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
    linksCreated: 0,
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
        let cleanHtml: string | undefined;
        if (bodyHtmlRaw) {
          try {
            const { cleanHtml: clean } = await import('./normalize');
            cleanHtml = clean(Buffer.from(bodyHtmlRaw, 'base64').toString());
          } catch (error) {
            console.warn('Failed to clean HTML:', error);
          }
        }

        // Extract labels and snippet
        const labels = message.labelIds || [];
        const snippet = message.snippet || '';

        // Step 5: Compute message hash and job signal score
        const messageHash = hashMessage({
          from: headerData.fromEmail,
          subject: headerData.subject,
          sentAt: new Date(headerData.internalDate).toISOString(),
          bodyText: bodyText || '',
        });

        const jobSignalScore = calculateJobSignalScore(
          headerData.subject,
          bodyText || ''
        );

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
          bccEmails: headerData.bccEmails,
          subject: headerData.subject,
          snippet,
          sentAt: new Date(headerData.internalDate),
          receivedAt: new Date(headerData.internalDate),
          bodyText,
          bodyHtmlClean: cleanHtml,
          labels,
          messageHash,
          isIncoming: true,
          jobSignalScore,
          parseStatus: 'unprocessed',
        });

        // Track insert vs update
        if (
          emailMessage.createdAt.getTime() === emailMessage.updatedAt.getTime()
        ) {
          summary.inserted++;
        } else {
          summary.updated++;
        }

        // Step 7: Extract and upsert links from ORIGINAL HTML (before cleaning)
        if (bodyText || bodyHtmlRaw) {
          const links = extractLinks({
            html: bodyHtmlRaw
              ? Buffer.from(bodyHtmlRaw, 'base64').toString()
              : undefined,
            text: bodyText,
          });

          if (links.length > 0) {
            const upsertedLinks = await upsertEmailLinks(
              emailMessage.id,
              links
            );
            summary.linksCreated += upsertedLinks.length;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process message ${messageRef.id}: ${error}`;
        console.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Sync failed: ${error}`;
    console.error(errorMsg);
    summary.errors.push(errorMsg);
  }

  return summary;
}
