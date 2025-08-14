import { db, emailMessagesTable, emailLinksTable } from '../../db';
import { eq, and } from 'drizzle-orm';

export interface EmailMessageInput {
  userId: string;
  provider: 'gmail';
  providerMessageId: string;
  providerThreadId: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  snippet?: string;
  sentAt: Date;
  receivedAt?: Date;
  bodyText?: string;
  bodyHtmlClean?: string;
  labels: string[];
  messageHash: string;
  isIncoming: boolean;
  jobSignalScore?: string;
  parseStatus?: 'unprocessed' | 'parsed' | 'failed';
  parseError?: string;
}

export interface EmailLinkInput {
  url: string;
  normalizedUrl: string;
  domain?: string;
  type: 'job_posting' | 'unsubscribe' | 'tracking' | 'other';
  lastCheckedAt?: Date;
  statusCode?: number;
}

/**
 * Upsert email message with conflict resolution
 * @param message - Email message data
 * @returns Upserted message
 */
export async function upsertEmailMessage(message: EmailMessageInput) {
  try {
    const [upsertedMessage] = await db
      .insert(emailMessagesTable)
      .values({
        provider: message.provider,
        providerMessageId: message.providerMessageId,
        providerThreadId: message.providerThreadId,
        userId: message.userId,
        fromEmail: message.fromEmail,
        fromName: message.fromName,
        toEmails: message.toEmails,
        ccEmails: message.ccEmails || [],
        bccEmails: message.bccEmails || [],
        subject: message.subject,
        snippet: message.snippet,
        sentAt: message.sentAt,
        receivedAt: message.receivedAt || message.sentAt,
        bodyText: message.bodyText,
        bodyHtmlClean: message.bodyHtmlClean,
        labels: message.labels,
        messageHash: message.messageHash,
        isIncoming: message.isIncoming,
        jobSignalScore: message.jobSignalScore,
        parseStatus: message.parseStatus || 'unprocessed',
        parseError: message.parseError,
      })
      .onConflictDoUpdate({
        target: [
          emailMessagesTable.userId,
          emailMessagesTable.provider,
          emailMessagesTable.providerMessageId,
        ],
        set: {
          providerThreadId: message.providerThreadId,
          fromEmail: message.fromEmail,
          fromName: message.fromName,
          toEmails: message.toEmails,
          ccEmails: message.ccEmails || [],
          bccEmails: message.bccEmails || [],
          subject: message.subject,
          snippet: message.snippet,
          sentAt: message.sentAt,
          receivedAt: message.receivedAt || message.sentAt,
          bodyText: message.bodyText,
          bodyHtmlClean: message.bodyHtmlClean,
          labels: message.labels,
          messageHash: message.messageHash,
          isIncoming: message.isIncoming,
          jobSignalScore: message.jobSignalScore,
          parseStatus: message.parseStatus || 'unprocessed',
          parseError: message.parseError,
          updatedAt: new Date(),
        },
      })
      .returning();

    return upsertedMessage;
  } catch (error) {
    console.error('Error upserting email message:', error);
    throw new Error(`Failed to upsert email message: ${error}`);
  }
}

/**
 * Upsert email links with deduplication
 * @param emailId - Email message ID
 * @param links - Array of email links
 * @returns Upserted links
 */
export async function upsertEmailLinks(
  emailId: string,
  links: EmailLinkInput[]
) {
  try {
    if (!links.length) {
      return [];
    }

    const upsertedLinks = [];

    for (const link of links) {
      // Check if link already exists for this email
      const existingLink = await db
        .select()
        .from(emailLinksTable)
        .where(
          and(
            eq(emailLinksTable.emailId, emailId),
            eq(emailLinksTable.normalizedUrl, link.normalizedUrl)
          )
        )
        .limit(1);

      if (existingLink.length > 0) {
        // Update existing link
        const [updatedLink] = await db
          .update(emailLinksTable)
          .set({
            url: link.url,
            domain: link.domain,
            type: link.type,
            lastCheckedAt: link.lastCheckedAt,
            statusCode: link.statusCode,
          })
          .where(eq(emailLinksTable.id, existingLink[0].id))
          .returning();

        upsertedLinks.push(updatedLink);
      } else {
        // Insert new link
        const [newLink] = await db
          .insert(emailLinksTable)
          .values({
            id: crypto.randomUUID(),
            emailId,
            url: link.url,
            normalizedUrl: link.normalizedUrl,
            domain: link.domain,
            type: link.type,
            lastCheckedAt: link.lastCheckedAt,
            statusCode: link.statusCode,
          })
          .returning();

        upsertedLinks.push(newLink);
      }
    }

    return upsertedLinks;
  } catch (error) {
    console.error('Error upserting email links:', error);
    throw new Error(`Failed to upsert email links: ${error}`);
  }
}

/**
 * Get email message by provider message ID
 * @param userId - User ID
 * @param provider - Email provider
 * @param providerMessageId - Provider's message ID
 * @returns Email message or null if not found
 */
export async function getEmailMessage(
  userId: string,
  provider: 'gmail',
  providerMessageId: string
) {
  try {
    const [message] = await db
      .select()
      .from(emailMessagesTable)
      .where(
        and(
          eq(emailMessagesTable.userId, userId),
          eq(emailMessagesTable.provider, provider),
          eq(emailMessagesTable.providerMessageId, providerMessageId)
        )
      )
      .limit(1);

    return message || null;
  } catch (error) {
    console.error('Error getting email message:', error);
    throw new Error(`Failed to get email message: ${error}`);
  }
}

/**
 * Get email links by email ID
 * @param emailId - Email message ID
 * @returns Array of email links
 */
export async function getEmailLinks(emailId: string) {
  try {
    return await db
      .select()
      .from(emailLinksTable)
      .where(eq(emailLinksTable.emailId, emailId));
  } catch (error) {
    console.error('Error getting email links:', error);
    throw new Error(`Failed to get email links: ${error}`);
  }
}
