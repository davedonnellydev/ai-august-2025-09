import { gmail_v1 } from 'googleapis';
import { getGmail } from './gmailClient';

export interface MessageListParams {
  userId: string;
  label: string;
  maxResults?: number;
  q?: string;
}

export interface MessageDetails {
  headers: gmail_v1.Schema$MessagePartHeader[];
  internalDate: string;
  snippet: string;
  payload: gmail_v1.Schema$MessagePart;
  threadId: string;
  historyId: string;
}

export interface Color {
  textColor: string;
  backgroundColor: string;
}

export interface Label {
  id: string;
  name: string;
  messageListVisibility: 'show' | 'hide';
  labelListVisibility: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  type: 'system' | 'user';
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  color: Color;
}

export interface LabelResponse {
  labels: Label[];
}

/**
 * List message IDs by label with optional query filter
 * @param params - Parameters for listing messages
 * @returns Array of message IDs with metadata
 */
export async function listMessageIdsByLabel({
  userId,
  label,
  maxResults = 10,
  q,
}: MessageListParams): Promise<gmail_v1.Schema$Message[]> {
  try {
    const gmail = await getGmail(userId);

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [label],
      maxResults,
      q,
    });

    if (!response.data.messages) {
      return [];
    }

    return response.data.messages;
  } catch (error) {
    console.error('Error listing messages by label:', error);
    throw new Error(`Failed to list messages for label ${label}: ${error}`);
  }
}

/**
 * Get detailed message information including headers and payload
 * @param userId - User identifier
 * @param messageId - Gmail message ID
 * @returns Message details with headers, payload, and metadata
 */
export async function getMessage(
  userId: string,
  messageId: string
): Promise<MessageDetails> {
  try {
    const gmail = await getGmail(userId);

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full', // Get full message with payload
    });

    const message = response.data;

    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    return {
      headers: message.payload?.headers || [],
      internalDate: message.internalDate || '',
      snippet: message.snippet || '',
      payload: message.payload || {},
      threadId: message.threadId || '',
      historyId: message.historyId || '',
    };
  } catch (error) {
    console.error('Error fetching message:', error);
    throw new Error(`Failed to fetch message ${messageId}: ${error}`);
  }
}

/**
 * Get multiple messages by their IDs
 * @param userId - User identifier
 * @param messageIds - Array of Gmail message IDs
 * @returns Array of message details
 */
export async function getMessages(
  userId: string,
  messageIds: string[]
): Promise<MessageDetails[]> {
  try {
    const messagePromises = messageIds.map((id) => getMessage(userId, id));
    return await Promise.all(messagePromises);
  } catch (error) {
    console.error('Error fetching multiple messages:', error);
    throw new Error(`Failed to fetch messages: ${error}`);
  }
}

export async function getLabels(
  userId: string
): Promise<gmail_v1.Schema$ListLabelsResponse> {
  try {
    const gmail = await getGmail(userId);

    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching label list:', error);
    throw new Error(`Failed to fetch label list: ${error}`);
  }
}
