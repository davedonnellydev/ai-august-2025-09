import { getGmail } from '../google/gmailClient';
import { getSyncState, updateSyncState } from '../email/syncState';
import {
  extractPlainText,
  extractLinks,
  hashMessage,
} from '../email/normalize';
import { upsertEmailMessage, upsertEmailLinks } from '../email/upsert';
import { extractMessageData, calculateJobSignalScore, extractHtmlFromPayload } from '../email/shared';
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
  const bodyHtmlRaw = extractHtmlFromPayload(message.payload);

  // Clean HTML if present (for storage)
  let cleanHtml: string | undefined;
  if (bodyHtmlRaw) {
    try {
      const { cleanHtml: clean } = await import('../email/normalize');
      cleanHtml = clean(Buffer.from(bodyHtmlRaw, 'base64').toString());
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

  // Extract and upsert links from ORIGINAL HTML (before cleaning)
  let linksCreated = 0;
  if (bodyText || bodyHtmlRaw) {
    const links = extractLinks({
      html: bodyHtmlRaw ? Buffer.from(bodyHtmlRaw, 'base64').toString() : undefined,
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

    history.forEach((historyRecord: gmail_v1.Schema$History) => {
      if (historyRecord.messagesAdded) {
        historyRecord.messagesAdded.forEach((messageAdded: gmail_v1.Schema$HistoryMessageAdded) => {
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
