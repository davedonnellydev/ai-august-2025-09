import { gmail_v1 } from 'googleapis';

/**
 * Extract email headers and build message data from Gmail message
 */
export function extractMessageData(message: gmail_v1.Schema$Message): {
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
export function calculateJobSignalScore(subject: string, bodyText: string): string {
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
 * Extract HTML content from Gmail message payload
 */
export function extractHtmlFromPayload(payload: gmail_v1.Schema$MessagePart): string | undefined {
  const htmlData = payload.body?.data ||
    payload.parts?.find((p) => p.mimeType === 'text/html')?.body?.data;
  
  return htmlData || undefined;
}
