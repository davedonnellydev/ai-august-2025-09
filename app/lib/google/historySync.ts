import { getGmail } from './gmailClient';
import { getSyncState, updateSyncState } from '../email/syncState';
import {
  extractPlainText,
  extractLinks,
  hashMessage,
} from '../email/normalize';
import { upsertEmailMessage, upsertEmailLinks } from '../email/upsert';
import { gmail_v1 } from 'googleapis';

export interface HistorySyncOptions {
  userId: string;
  label: string;
}

export interface HistorySyncResult {
  usedFallback: boolean;
  processed: number;
  inserted: number;
  updated: number;
  linksCreated: number;
  errors: string[];
  newHistoryId?: string;
}

/**
 * Extract email headers and build message data from Gmail message
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
 * Process a single Gmail message and upsert to database
 */
async function processMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  userId: string
): Promise<{
  inserted: boolean;
  linksCreated: number;
}> {
  // Fetch full message
  const messageResponse = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = messageResponse.data;
  if (!message.payload) {
    throw new Error('Message has no payload');
  }

  // Extract header fields
  const headerData = extractMessageData(message);

  // Build body content
  const bodyText = extractPlainText(message.payload as any);
  const bodyHtmlClean =
    message.payload.body?.data ||
    message.payload.parts?.find((p) => p.mimeType === 'text/html')?.body?.data;

  // Clean HTML if present
  let cleanHtml: string | undefined;
  if (bodyHtmlClean) {
    try {
      const { cleanHtml: clean } = await import('../email/normalize');
      cleanHtml = clean(Buffer.from(bodyHtmlClean, 'base64').toString());
    } catch (error) {
      console.warn('Failed to clean HTML:', error);
    }
  }

  // Extract labels and snippet
  const labels = message.labelIds || [];
  const snippet = message.snippet || '';

  // Compute message hash and job signal score
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

  // Upsert email message
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
  const isInserted =
    emailMessage.createdAt.getTime() === emailMessage.updatedAt.getTime();

  // Extract and upsert links
  let linksCreated = 0;
  if (bodyText || cleanHtml) {
    const links = extractLinks({
      html: cleanHtml,
      text: bodyText,
    });

    if (links.length > 0) {
      const upsertedLinks = await upsertEmailLinks(emailMessage.id, links);
      linksCreated = upsertedLinks.length;
    }
  }

  return { inserted: isInserted, linksCreated };
}

/**
 * Sync Gmail messages using History API
 */
export async function syncByHistory({
  userId,
  label,
}: HistorySyncOptions): Promise<HistorySyncResult> {
  const result: HistorySyncResult = {
    usedFallback: false,
    processed: 0,
    inserted: 0,
    updated: 0,
    linksCreated: 0,
    errors: [],
  };

  try {
    // Step 1: Read lastHistoryId for user from DB
    const syncState = await getSyncState(userId);

    if (!syncState || !syncState.lastHistoryId) {
      console.log(`No history ID found for user ${userId}, will use fallback`);
      result.usedFallback = true;
      return result;
    }

    const gmail = await getGmail(userId);
    const startHistoryId = syncState.lastHistoryId;
    let latestHistoryId = startHistoryId;

    console.log(
      `Starting history sync from ${startHistoryId} for label ${label}`
    );

    // Step 2: Call gmail.users.history.list with startHistoryId
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: label,
    });

    const history = historyResponse.data.history || [];

    if (history.length === 0) {
      console.log('No new history found');
      return result;
    }

    // Step 3: Gather new messageIds for the label
    const messageIds = new Set<string>();

    history.forEach((historyRecord) => {
      if (historyRecord.messagesAdded) {
        historyRecord.messagesAdded.forEach((messageAdded) => {
          if (messageAdded.message?.id) {
            messageIds.add(messageAdded.message.id);
          }
        });
      }

      // Track the latest history ID
      if (historyRecord.id && historyRecord.id > latestHistoryId) {
        latestHistoryId = historyRecord.id;
      }
    });

    console.log(`Found ${messageIds.size} new messages in history`);

    // Step 4: Process each message
    for (const messageId of messageIds) {
      try {
        const { inserted, linksCreated } = await processMessage(
          gmail,
          messageId,
          userId
        );

        if (inserted) {
          result.inserted++;
        } else {
          result.updated++;
        }

        result.linksCreated += linksCreated;
        result.processed++;
      } catch (error) {
        const errorMsg = `Failed to process message ${messageId}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Step 5: Store the latest historyId back to DB
    if (latestHistoryId !== startHistoryId) {
      await updateSyncState(userId, { lastHistoryId: latestHistoryId });
      result.newHistoryId = latestHistoryId;
      console.log(
        `Updated history ID from ${startHistoryId} to ${latestHistoryId}`
      );
    }
  } catch (error) {
    const errorMsg = `History sync failed: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);

    // If history API fails, mark as needing fallback
    result.usedFallback = true;
  }

  return result;
}
