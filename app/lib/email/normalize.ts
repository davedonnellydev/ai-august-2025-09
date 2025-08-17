import { createHash } from 'crypto';
import { ExtractedLink, LinkType } from '../types/leads';

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
 * Extract links from email content with enhanced heuristics
 * @param input - Email content with HTML and/or text
 * @returns Array of extracted links with classification
 */
export function extractLinks(input: {
  html?: string;
  text?: string;
}): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  // Extract from HTML if available (with anchor text)
  if (input.html) {
    const htmlLinks = extractLinksFromHtml(input.html);
    htmlLinks.forEach((link) => {
      if (!seenUrls.has(link.normalizedUrl)) {
        seenUrls.add(link.normalizedUrl);
        links.push(link);
      }
    });
  }

  // Extract from text if available
  if (input.text) {
    const textLinks = extractLinksFromText(input.text);
    textLinks.forEach((link) => {
      if (!seenUrls.has(link.normalizedUrl)) {
        seenUrls.add(link.normalizedUrl);
        links.push(link);
      }
    });
  }

  return links;
}

/**
 * Extract links from HTML with anchor text
 */
function extractLinksFromHtml(html: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  // Match anchor tags with href and text content
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const [, url, anchorText] = match;
    const cleanAnchorText = anchorText.trim();

    if (url && isValidUrl(url)) {
      const linkInfo = classifyAndNormalizeLink(url, cleanAnchorText);
      links.push(linkInfo);
    }
  }

  // Also extract any remaining URLs that might not be in anchor tags
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = html.match(urlRegex) || [];

  urls.forEach((url) => {
    if (!links.some((link) => link.url === url)) {
      const linkInfo = classifyAndNormalizeLink(url);
      links.push(linkInfo);
    }
  });

  return links;
}

/**
 * Extract links from plain text
 */
function extractLinksFromText(text: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = text.match(urlRegex) || [];

  urls.forEach((url) => {
    const linkInfo = classifyAndNormalizeLink(url);
    links.push(linkInfo);
  });

  return links;
}

/**
 * Check if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Classify and normalize a single link with enhanced heuristics
 */
function classifyAndNormalizeLink(
  url: string,
  anchorText?: string
): ExtractedLink {
  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(normalizedUrl);

  // Apply heuristics to determine link type and characteristics
  const heuristics = analyzeLink(url, normalizedUrl, domain, anchorText);

  return {
    url,
    normalizedUrl,
    anchorText,
    type: heuristics.type,
    domain,
    isLikelyJobList: heuristics.isLikelyJobList,
    isUnsubscribe: heuristics.isUnsubscribe,
    isTracking: heuristics.isTracking,
  };
}

/**
 * Analyze link with enhanced heuristics
 */
function analyzeLink(
  _url: string,
  normalizedUrl: string,
  domain: string,
  anchorText?: string
): {
  type: LinkType;
  isLikelyJobList: boolean;
  isUnsubscribe: boolean;
  isTracking: boolean;
} {
  let type: LinkType = 'other';
  let isLikelyJobList = false;
  let isUnsubscribe = false;
  let isTracking = false;

  // Check for job list patterns (careers pages, job listings) first
  if (isJobListUrl(normalizedUrl, domain, anchorText)) {
    type = 'job_list';
    isLikelyJobList = true;
  }
  // Check for job posting patterns
  else if (isJobPostingUrl(normalizedUrl, domain)) {
    type = 'job_posting';
  }
  // Check for company pages
  else if (isCompanyUrl(normalizedUrl, domain)) {
    type = 'company';
  }
  // Check for unsubscribe patterns
  else if (isUnsubscribeUrl(normalizedUrl, anchorText)) {
    type = 'unsubscribe';
    isUnsubscribe = true;
  }
  // Check for tracking patterns
  else if (isTrackingUrl(normalizedUrl, domain)) {
    type = 'tracking';
    isTracking = true;
  }

  return { type, isLikelyJobList, isUnsubscribe, isTracking };
}

/**
 * Normalize URL by removing tracking parameters and fragments
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove tracking parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'mc_eid',
      'igshid',
      'vero_id',
      'mc_cid',
      'mc_eid',
      'mc_tc',
      'mc_rid',
      'mc_lid',
      'mc_sid',
      'mc_uid',
      'mc_oid',
      'mc_geo',
      'mc_cc',
      'mc_ll',
      'mc_zip',
      'mc_phone',
      'mc_company',
      'mc_jobtitle',
    ];

    trackingParams.forEach((param) => {
      urlObj.searchParams.delete(param);
    });

    // Remove fragments
    urlObj.hash = '';

    // Remove empty query string if no params remain
    if (urlObj.searchParams.toString() === '') {
      urlObj.search = '';
    }

    return urlObj.toString();
  } catch {
    // Fallback: basic cleaning if URL parsing fails
    return url.replace(/[<>"{}|\\^`[\]]/g, '').replace(/[?#].*$/, '');
  }
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
    'ziprecruiter.com',
    'careerbuilder.com',
    'monster.com',
    'dice.com',
    'angel.co',
    'stackoverflow.com',
    'builtin.com',
  ];

  const jobPatterns = [
    /\/careers?\//i,
    /\/jobs?\//i,
    /\/position\//i,
    /\/opening\//i,
    /\/apply\//i,
    /\/recruitment\//i,
    /\/hiring\//i,
    /\/posting\//i,
    /\/vacancy\//i,
    /\/opportunity\//i,
    /\/role\//i,
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
 * Check if URL is likely a job list/careers page
 */
function isJobListUrl(
  url: string,
  _domain: string,
  anchorText?: string
): boolean {
  // Check anchor text patterns
  if (anchorText) {
    const jobListPatterns = [
      /(see\s+(all\s+)?jobs?|browse\s+jobs?|careers?|view\s+all|more\s+jobs?)/i,
      /(job\s+board|career\s+opportunities|open\s+positions)/i,
    ];

    if (jobListPatterns.some((pattern) => pattern.test(anchorText))) {
      return true;
    }
  }

  // Check URL path patterns
  const jobListPathPatterns = [
    /\/careers?(\/)?$/i,
    /\/jobs?(\/)?$/i,
    /\/opportunities(\/)?$/i,
    /\/openings(\/)?$/i,
    /\/positions(\/)?$/i,
    /\/hiring(\/)?$/i,
  ];

  if (jobListPathPatterns.some((pattern) => pattern.test(url))) {
    return true;
  }

  return false;
}

/**
 * Check if URL is likely a company page
 */
function isCompanyUrl(url: string, _domain: string): boolean {
  const companyPatterns = [
    /\/about(\/)?$/i,
    /\/company(\/)?$/i,
    /\/team(\/)?$/i,
    /\/culture(\/)?$/i,
    /\/values(\/)?$/i,
    /\/contact(\/)?$/i,
  ];

  return companyPatterns.some((pattern) => pattern.test(url));
}

/**
 * Check if URL is likely an unsubscribe link
 */
function isUnsubscribeUrl(url: string, anchorText?: string): boolean {
  // Check anchor text first
  if (anchorText) {
    const unsubscribePatterns = [
      /unsubscribe/i,
      /opt.?out/i,
      /remove/i,
      /unsub/i,
      /stop\s+emails/i,
      /email\s+preferences/i,
      /manage\s+subscription/i,
    ];

    if (unsubscribePatterns.some((pattern) => pattern.test(anchorText))) {
      return true;
    }
  }

  // Check URL patterns
  const unsubscribeUrlPatterns = [
    /unsubscribe/i,
    /opt.?out/i,
    /remove/i,
    /unsub/i,
    /email\s+preferences/i,
    /subscription/i,
    /manage/i,
  ];

  return unsubscribeUrlPatterns.some((pattern) => pattern.test(url));
}

/**
 * Check if URL is likely a tracking/redirect link
 */
function isTrackingUrl(url: string, _domain: string): boolean {
  const trackingDomains = [
    'go.redirectingat.com',
    'click.email',
    'track.email',
    'links.email',
    'click.newsletter',
    'track.newsletter',
    'go.newsletter',
    'link.newsletter',
  ];

  const trackingPatterns = [
    /\/click\//i,
    /\/track\//i,
    /\/go\//i,
    /\/link\//i,
    /\/redirect\//i,
    /\/forward\//i,
    /\/bounce\//i,
  ];

  // Check domain
  if (trackingDomains.some((d) => _domain.includes(d))) {
    return true;
  }

  // Check URL patterns
  if (trackingPatterns.some((pattern) => pattern.test(url))) {
    return true;
  }

  // Check for common tracking parameters
  if (url.includes('utm_') || url.includes('fbclid') || url.includes('gclid')) {
    return true;
  }

  return false;
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

  // Test 2: Enhanced link extraction and classification
  const testInput = {
    html: `
      <a href="https://seek.com.au/jobs/123">Apply here</a>
      <a href="https://company.com/careers">See all jobs</a>
      <a href="https://newsletter.com/unsubscribe">Unsubscribe</a>
      <a href="https://tracking.com/click/abc123">Click here</a>
      <a href="https://other.com/page">Other link</a>
    `,
    text: 'Check out https://linkedin.com/jobs/456',
  };

  const links = extractLinks(testInput);
  const jobLinks = links.filter((l) => l.type === 'job_posting');
  const jobListLinks = links.filter((l) => l.type === 'job_list');
  const unsubscribeLinks = links.filter((l) => l.type === 'unsubscribe');
  const trackingLinks = links.filter((l) => l.type === 'tracking');

  console.log(
    '✅ Enhanced link extraction:',
    links.length >= 5 ? 'PASS' : 'FAIL'
  );
  console.log('   Job posting links:', jobLinks.length);
  console.log('   Job list links:', jobListLinks.length);
  console.log('   Unsubscribe links:', unsubscribeLinks.length);
  console.log('   Tracking links:', trackingLinks.length);
  console.log(
    '   All links:',
    links.map((l) => `${l.domain} (${l.type})`)
  );

  // Test 3: URL normalization
  const testUrl =
    'https://example.com/jobs?utm_source=email&utm_campaign=jobs#section';
  const normalized = normalizeUrl(testUrl);
  const noTracking = !normalized.includes('utm_') && !normalized.includes('#');

  console.log('✅ URL normalization:', noTracking ? 'PASS' : 'FAIL');
  console.log('   Original:', testUrl);
  console.log('   Normalized:', normalized);

  // Test 4: Hash stability
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
