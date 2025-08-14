import { getGmail } from '../google/gmailClient';
import { extractPlainText, extractLinks, hashMessage } from './normalize';
import { upsertEmailMessage, upsertEmailLinks } from './upsert';
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
 * Extract email headers and build message data
 */
function extractMessageData(message: gmail_v1.Schema$Message): {
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  internalDate: number;
} {
  const headers = message.payload?.headers || [];

  const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from');
  const toHeader = headers.find((h) => h.name?.toLowerCase() === 'to');
  const ccHeader = headers.find((h) => h.name?.toLowerCase() === 'cc');
  const bccHeader = headers.find((h) => h.name?.toLowerCase() === 'bcc');
  const subjectHeader = headers.find(
    (h) => h.name?.toLowerCase() === 'subject'
  );

  // Parse from field
  let fromEmail = '';
  let fromName = '';
  if (fromHeader?.value) {
    const fromMatch = fromHeader.value.match(
      /(?:"?([^"]*)"?\s)?<?([^<>@\s]+@[^<>\s]+)>?/
    );
    if (fromMatch) {
      fromName = fromMatch[1] || '';
      fromEmail = fromMatch[2] || '';
    } else {
      fromEmail = fromHeader.value;
    }
  }

  // Parse to/cc/bcc fields
  const parseEmailList = (value?: string | null): string[] => {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map((email) => email.trim().match(/<?([^<>@\s]+@[^<>\s]+)>?/)?.[1])
      .filter(Boolean) as string[];
  };

  const toEmails = parseEmailList(toHeader?.value);
  const ccEmails = parseEmailList(ccHeader?.value);
  const bccEmails = parseEmailList(bccHeader?.value);

  return {
    fromEmail,
    fromName: fromName || undefined,
    toEmails,
    ccEmails,
    bccEmails,
    subject: subjectHeader?.value || '',
    internalDate: parseInt(message.internalDate || '0', 10),
  };
}

/**
 * Calculate naive job signal score based on keyword matches
 */
function calculateJobSignalScore(subject: string, bodyText: string): string {
  const keywords = [
    'role',
    'job',
    'apply',
    'position',
    'frontend',
    'backend',
    'fullstack',
    'developer',
    'engineer',
    'software',
    'application',
    'opportunity',
    'hiring',
    'recruitment',
    'career',
    'employment',
    'vacancy',
    'opening',
  ];

  const text = `${subject} ${bodyText}`.toLowerCase();
  let score = 0;
  let matches = 0;

  keywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      matches++;
      // Give more weight to subject matches
      if (subject.toLowerCase().includes(keyword)) {
        score += 0.1;
      } else {
        score += 0.05;
      }
    }
  });

  // Normalize to 0-1 range, with bonus for multiple matches
  const normalizedScore = Math.min(1.0, score + matches * 0.02);

  // Format as string with 3 decimal places (matching DB schema)
  return normalizedScore.toFixed(3);
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
        const bodyHtmlClean =
          message.payload.body?.data ||
          message.payload.parts?.find((p) => p.mimeType === 'text/html')?.body
            ?.data;

        // Clean HTML if present
        let cleanHtml: string | undefined;
        if (bodyHtmlClean) {
          try {
            const { cleanHtml: clean } = await import('./normalize');
            cleanHtml = clean(Buffer.from(bodyHtmlClean, 'base64').toString());
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

        // Step 7: Extract and upsert links
        if (bodyText || cleanHtml) {
          const links = extractLinks({
            html: cleanHtml,
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
