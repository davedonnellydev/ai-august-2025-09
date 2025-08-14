import { createHash } from 'crypto';

export interface Payload {
  mimeType?: string;
  body?: {
    data?: string;
  };
  parts?: Payload[];
}

export interface LinkInfo {
  url: string;
  normalizedUrl: string;
  domain: string;
  type: 'job_posting' | 'unsubscribe' | 'other';
}

export interface MessageHashInput {
  from: string;
  subject: string;
  sentAt: string;
  bodyText: string;
}

/**
 * Extract plain text from email content
 * @param payload - Email payload with MIME parts
 * @returns Plain text content
 */
export function extractPlainText(payload: Payload): string {
  if (!payload) {
    return '';
  }

  // If it's text/plain, decode and return
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } catch (error) {
      console.warn('Failed to decode text/plain:', error);
    }
  }

  // If it's text/html, convert to text
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    try {
      const html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return cleanHtml(html);
    } catch (error) {
      console.warn('Failed to decode text/html:', error);
    }
  }

  // Recursively check parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) {
        return text;
      }
    }
  }

  return '';
}

/**
 * Clean HTML content by removing scripts, styles, and tracking pixels
 * @param html - Raw HTML content
 * @returns Cleaned HTML content
 */
export function cleanHtml(html: string): string {
  if (!html) {
    return '';
  }

  // Remove script tags and their content
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove style tags and their content
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove tracking pixels (1x1 images)
  cleaned = cleaned.replace(/<img[^>]*1x1[^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*width="1"[^>]*height="1"[^>]*>/gi, '');

  // Remove common tracking attributes
  cleaned = cleaned.replace(
    /\s+(?:on\w+|data-tracking|data-analytics)="[^"]*"/gi,
    ''
  );

  // Convert common HTML entities to text
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');

  // Convert HTML to readable text
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/p>/gi, '\n\n');
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  cleaned = cleaned.replace(/<\/h[1-6]>/gi, '\n');

  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/^\s+|\s+$/g, '');

  return cleaned;
}

/**
 * Extract links from email content
 * @param input - Email content with HTML and/or text
 * @returns Array of extracted links with classification
 */
export function extractLinks(input: {
  html?: string;
  text?: string;
}): LinkInfo[] {
  const links: LinkInfo[] = [];
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

  // Extract from HTML if available
  if (input.html) {
    const htmlUrls = input.html.match(urlRegex) || [];
    htmlUrls.forEach((url) => {
      const linkInfo = classifyAndNormalizeLink(url);
      if (
        !links.some(
          (existing) => existing.normalizedUrl === linkInfo.normalizedUrl
        )
      ) {
        links.push(linkInfo);
      }
    });
  }

  // Extract from text if available
  if (input.text) {
    const textUrls = input.text.match(urlRegex) || [];
    textUrls.forEach((url) => {
      const linkInfo = classifyAndNormalizeLink(url);
      if (
        !links.some(
          (existing) => existing.normalizedUrl === linkInfo.normalizedUrl
        )
      ) {
        links.push(linkInfo);
      }
    });
  }

  return links;
}

/**
 * Classify and normalize a single link
 */
function classifyAndNormalizeLink(url: string): LinkInfo {
  const normalizedUrl = url.replace(/[<>"{}|\\^`[\]]/g, '');
  const domain = extractDomain(normalizedUrl);

  let type: LinkInfo['type'] = 'other';

  // Check for job posting patterns
  if (isJobPostingUrl(normalizedUrl, domain)) {
    type = 'job_posting';
  }
  // Check for unsubscribe patterns
  else if (isUnsubscribeUrl(normalizedUrl)) {
    type = 'unsubscribe';
  }

  return { url, normalizedUrl, domain, type };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    // Fallback regex extraction
    const match = url.match(/https?:\/\/([^/?#]+)/i);
    return match ? match[1].toLowerCase() : '';
  }
}

/**
 * Check if URL is likely a job posting
 */
function isJobPostingUrl(url: string, domain: string): boolean {
  const jobDomains = [
    'seek.com.au',
    'seek.com',
    'linkedin.com',
    'greenhouse.io',
    'workable.com',
    'lever.co',
    'indeed.com',
    'glassdoor.com',
  ];

  const jobPatterns = [
    /\/careers?\//i,
    /\/jobs?\//i,
    /\/position\//i,
    /\/opening\//i,
    /\/apply\//i,
    /\/recruitment\//i,
    /\/hiring\//i,
  ];

  // Check domain
  if (jobDomains.some((d) => domain.includes(d))) {
    return true;
  }

  // Check URL patterns
  if (jobPatterns.some((pattern) => pattern.test(url))) {
    return true;
  }

  // Special case for LinkedIn jobs
  if (domain.includes('linkedin.com') && url.includes('/jobs/')) {
    return true;
  }

  return false;
}

/**
 * Check if URL is likely an unsubscribe link
 */
function isUnsubscribeUrl(url: string): boolean {
  const unsubscribePatterns = [
    /unsubscribe/i,
    /opt.?out/i,
    /remove/i,
    /unsub/i,
  ];

  return unsubscribePatterns.some((pattern) => pattern.test(url));
}

/**
 * Generate hash for email message
 * @param input - Message fields to hash
 * @returns SHA256 hash string
 */
export function hashMessage(input: MessageHashInput): string {
  const normalizedInput = {
    from: input.from.toLowerCase().trim(),
    subject: input.subject.toLowerCase().trim(),
    sentAt: input.sentAt.trim(),
    bodyText: input.bodyText.trim(),
  };

  const hashInput = JSON.stringify(
    normalizedInput,
    Object.keys(normalizedInput).sort()
  );
  return createHash('sha256').update(hashInput).digest('hex');
}

// ===== INLINE TESTS =====

function runTests() {
  console.log('🧪 Running email normalization tests...');

  // Test 1: HTML to text extraction
  const testHtml = `
    <html>
      <head><title>Test Email</title></head>
      <body>
        <h1>Job Opportunity</h1>
        <p>We have a <strong>great position</strong> for you!</p>
        <script>alert('tracking');</script>
        <style>body { color: red; }</style>
        <img src="tracking.gif" width="1" height="1">
      </body>
    </html>
  `;

  const extractedText = cleanHtml(testHtml);
  const textContainsJob = extractedText.includes('Job Opportunity');
  const textNoScript = !extractedText.includes('tracking');

  console.log(
    '✅ HTML → Text extraction:',
    textContainsJob && textNoScript ? 'PASS' : 'FAIL'
  );
  console.log('   Extracted text:', `${extractedText.substring(0, 100)}...`);

  // Test 2: Link extraction and classification
  const testInput = {
    html: `
      <a href="https://seek.com.au/jobs/123">Apply here</a>
      <a href="https://company.com/careers">Careers</a>
      <a href="https://newsletter.com/unsubscribe">Unsubscribe</a>
      <a href="https://other.com/page">Other link</a>
    `,
    text: 'Check out https://linkedin.com/jobs/456',
  };

  const links = extractLinks(testInput);
  const jobLinks = links.filter((l) => l.type === 'job_posting');
  const unsubscribeLinks = links.filter((l) => l.type === 'unsubscribe');

  console.log('✅ Link extraction:', links.length >= 4 ? 'PASS' : 'FAIL');
  console.log('   Job links:', jobLinks.length);
  console.log('   Unsubscribe links:', unsubscribeLinks.length);
  console.log(
    '   All links:',
    links.map((l) => `${l.domain} (${l.type})`)
  );

  // Test 3: Hash stability
  const message1 = {
    from: 'test@example.com',
    subject: 'Job Opportunity',
    sentAt: '2025-08-14T10:00:00Z',
    bodyText: 'Great position available!',
  };

  const message2 = {
    from: 'test@example.com',
    subject: 'Job Opportunity',
    sentAt: '2025-08-14T10:00:00Z',
    bodyText: 'Great position available!',
  };

  const hash1 = hashMessage(message1);
  const hash2 = hashMessage(message2);
  const hashesMatch = hash1 === hash2;

  console.log('✅ Hash stability:', hashesMatch ? 'PASS' : 'FAIL');
  console.log('   Hash 1:', `${hash1.substring(0, 16)}...`);
  console.log('   Hash 2:', `${hash2.substring(0, 16)}...`);

  console.log('🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
