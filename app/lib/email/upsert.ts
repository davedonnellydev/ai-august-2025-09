interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  plainText: string;
  html?: string;
  receivedAt: Date;
  labels: string[];
}

interface EmailLink {
  id: string;
  messageId: string;
  url: string;
  text: string;
  domain: string;
}

/**
 * Upsert email message
 * @param message - Email message data
 * @returns Upserted message
 */
export function upsertEmailMessage(
  _message: EmailMessage
): Promise<EmailMessage> {
  // TODO: Implement email message upsert
  throw new Error('Not implemented');
}

/**
 * Upsert email links
 * @param links - Array of email links
 * @returns Upserted links
 */
export function upsertEmailLinks(_links: EmailLink[]): Promise<EmailLink[]> {
  // TODO: Implement email links upsert
  throw new Error('Not implemented');
}
