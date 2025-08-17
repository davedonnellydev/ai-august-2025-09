import { db, emailMessagesTable } from '../../db';
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
  subject: string;
  snippet?: string;
  sentAt: Date;
  receivedAt?: Date;
  bodyText?: string;
  bodyHtml?: string; // raw/cleaned html
  parseStatus?: 'unprocessed' | 'parsed' | 'failed';
  parseError?: string;
  messageHash: string;
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
        subject: message.subject,
        snippet: message.snippet,
        sentAt: message.sentAt,
        receivedAt: message.receivedAt || message.sentAt,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml,
        parseStatus: message.parseStatus || 'unprocessed',
        parseError: message.parseError,
        messageHash: message.messageHash,
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
          subject: message.subject,
          snippet: message.snippet,
          sentAt: message.sentAt,
          receivedAt: message.receivedAt || message.sentAt,
          bodyText: message.bodyText,
          bodyHtml: message.bodyHtml,
          parseStatus: message.parseStatus || 'unprocessed',
          parseError: message.parseError,
          messageHash: message.messageHash,
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
