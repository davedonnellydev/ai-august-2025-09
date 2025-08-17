import OpenAI from 'openai';

/**
 * Represents a potential job lead extracted from email content
 */
export type LeadCandidate = {
  url: string;
  normalizedUrl: string;
  type:
    | 'job_posting'
    | 'job_list'
    | 'company'
    | 'unsubscribe'
    | 'tracking'
    | 'other';
  title?: string;
  company?: string;
  location?: string;
  dedupeKey?: string;
  confidence: number; // 0..1
  anchorText?: string;
};

/**
 * Input for job lead extraction
 */
export interface ExtractionInput {
  emailText: string;
  rawLinks: Array<{ url: string; anchorText?: string }>;
  customInstructions?: string;
  userId: string;
  emailId: string;
}

/**
 * Result of job lead extraction
 */
export interface ExtractionResult {
  leads: LeadCandidate[];
  tokens: { input: number; output: number };
}

/**
 * Normalize URL by removing tracking parameters, fragments, and standardizing format
 * @param url - Raw URL to normalize
 * @returns Normalized URL
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Convert hostname to lowercase
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // Remove fragments (everything after #)
    urlObj.hash = '';

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
      'ref',
      'source',
      'campaign',
      'medium',
      'term',
      'content',
    ];

    // Filter out tracking parameters
    const filteredParams = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      if (!trackingParams.some((param) => key.toLowerCase().includes(param))) {
        filteredParams.set(key, value);
      }
    });
    urlObj.search = filteredParams.toString();

    // Remove empty query string if no params remain
    if (urlObj.search === '?') {
      urlObj.search = '';
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn(`Failed to normalize URL: ${url}`, error);
    return url;
  }
}

/**
 * Pre-filter links to remove obvious unsubscribe/tracking links
 * @param links - Array of raw links with anchor text
 * @returns Filtered links that should be processed
 */
function preFilterLinks(
  links: Array<{ url: string; anchorText?: string }>
): Array<{ url: string; anchorText?: string }> {
  const unsubscribePatterns = [
    /unsubscribe/i,
    /opt.?out/i,
    /remove/i,
    /unsub/i,
    /stop/i,
    /cancel/i,
  ];

  const trackingPatterns = [
    /tracking/i,
    /pixel/i,
    /beacon/i,
    /analytics/i,
    /monitor/i,
  ];

  const knownUnsubscribeDomains = [
    'unsubscribe.com',
    'optout.com',
    'mailchimp.com',
    'constantcontact.com',
    'sendgrid.com',
    'mailgun.com',
    'klaviyo.com',
  ];

  return links.filter(({ url, anchorText }) => {
    const text = `${url} ${anchorText || ''}`.toLowerCase();

    // Check for unsubscribe patterns in anchor text or URL
    if (unsubscribePatterns.some((pattern) => pattern.test(text))) {
      return false;
    }

    // Check for tracking patterns
    if (trackingPatterns.some((pattern) => pattern.test(text))) {
      return false;
    }

    // Check for known unsubscribe domains
    try {
      const urlObj = new URL(url);
      if (
        knownUnsubscribeDomains.some((domain) =>
          urlObj.hostname.includes(domain)
        )
      ) {
        return false;
      }
    } catch {
      // If URL parsing fails, include it for further analysis
    }

    return true;
  });
}

/**
 * Generate deduplication key for a lead candidate
 * @param candidate - Lead candidate to generate key for
 * @returns Deduplication key string
 */
function generateDedupeKey(candidate: LeadCandidate): string {
  const { normalizedUrl, type, company, title } = candidate;

  // For job postings, create a more specific key
  if (type === 'job_posting' && company && title) {
    return `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }

  // For other types, use normalized URL as key
  return normalizedUrl;
}

/**
 * Build the prompt for OpenAI to extract job leads.
 * @param emailText - The full email content.
 * @param filteredLinks - The pre-filtered links to analyze.
 * @param customInstructions - Optional custom instructions for the model.
 * @returns The constructed prompt.
 */
function buildExtractionPrompt(
  emailText: string,
  filteredLinks: Array<{ url: string; anchorText?: string }>,
  customInstructions?: string
): string {
  const systemPrompt = `You are an expert at analyzing job-related emails and extracting relevant job leads.

Your task is to analyze the email content and links to identify potential job opportunities and related information.

For each link, determine the most appropriate type:
- 'job_posting': Direct link to a specific job posting/application
- 'job_list': Link to a list of jobs (e.g., "See all jobs", "Browse careers")
- 'company': Link to company information, careers page, or about page
- 'unsubscribe': Link to unsubscribe from emails (should be rare after pre-filtering)
- 'tracking': Analytics or tracking links (should be rare after pre-filtering)
- 'other': Any other relevant link

Extract relevant information:
- title: Job title if available
- company: Company name if mentioned
- location: Job location if specified
- confidence: Your confidence in this classification (0.0 to 1.0)

${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

Focus on identifying genuine job opportunities and relevant career information. Be conservative with confidence scores.`;

  const userPrompt = `Email Content:
${emailText}

Links to analyze:
${filteredLinks
  .map(
    (link, index) =>
      `${index + 1}. URL: ${link.url}
   Normalized: ${normalizeUrl(link.url)}
   Anchor Text: ${link.anchorText || 'None'}`
  )
  .join('\n\n')}

Please analyze each link and provide structured output with the type, extracted information, and confidence score.`;

  return `${systemPrompt}\n\n${userPrompt}`;
}

/**
 * Parse the structured output from OpenAI to extract LeadCandidate objects.
 * @param responseText - The full response text from OpenAI.
 * @returns An array of LeadCandidate objects.
 */
function parseLeadsFromResponse(responseText: string): LeadCandidate[] {
  const leads: LeadCandidate[] = [];
  const lines = responseText.split('\n');
  let currentLead: Partial<LeadCandidate> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('URL:')) {
      // Save previous lead if complete
      if (
        currentLead.url &&
        currentLead.type &&
        currentLead.confidence !== undefined
      ) {
        const lead = currentLead as LeadCandidate;
        lead.dedupeKey = generateDedupeKey(lead);
        leads.push(lead);
      }

      // Start new lead
      currentLead = {
        url: trimmed.replace('URL:', '').trim(),
        normalizedUrl: '',
        type: 'other',
        confidence: 0.5,
      };
    } else if (trimmed.startsWith('Type:')) {
      const type = trimmed.replace('Type:', '').trim().toLowerCase();
      if (
        [
          'job_posting',
          'job_list',
          'company',
          'unsubscribe',
          'tracking',
          'other',
        ].includes(type)
      ) {
        currentLead.type = type as any;
      }
    } else if (trimmed.startsWith('Title:')) {
      currentLead.title = trimmed.replace('Title:', '').trim();
    } else if (trimmed.startsWith('Company:')) {
      currentLead.company = trimmed.replace('Company:', '').trim();
    } else if (trimmed.startsWith('Location:')) {
      currentLead.location = trimmed.replace('Location:', '').trim();
    } else if (trimmed.startsWith('Confidence:')) {
      const confidence = parseFloat(
        trimmed.replace('Confidence:', '').trim()
      );
      if (!isNaN(confidence) && confidence >= 0 && confidence <= 1) {
        currentLead.confidence = confidence;
      }
    }
  }

  // Add the last lead if complete
  if (
    currentLead.url &&
    currentLead.type &&
    currentLead.confidence !== undefined
  ) {
    const lead = currentLead as LeadCandidate;
    lead.dedupeKey = generateDedupeKey(lead);
    leads.push(lead);
  }

  return leads;
}

/**
 * Post-process extracted leads to ensure consistency and set normalized URLs.
 * @param leads - The raw leads extracted from the model.
 * @returns The processed leads.
 */
function postProcessLeads(leads: LeadCandidate[]): LeadCandidate[] {
  return leads.map((lead) => {
    // Ensure normalized URL is set
    if (!lead.normalizedUrl) {
      lead.normalizedUrl = normalizeUrl(lead.url);
    }

    return lead;
  });
}

/**
 * Extract job leads from email content using OpenAI Responses API
 * @param input - Extraction input containing email text, links, and metadata
 * @returns Promise resolving to extraction result with leads and token usage
 */
export async function extractJobLeads(
  input: ExtractionInput
): Promise<ExtractionResult> {
  // Validate OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Validate input
  if (!input.emailText || !input.rawLinks || !input.userId || !input.emailId) {
    throw new Error('Missing required input parameters');
  }

  // Step 1: Pre-filter links to focus on job-related ones
  const filteredLinks = preFilterLinks(input.rawLinks);

  if (filteredLinks.length === 0) {
    return {
      leads: [],
      tokens: { input: 0, output: 0 },
    };
  }

  // Step 2: Prepare prompt for OpenAI
  const prompt = buildExtractionPrompt(
    input.emailText,
    filteredLinks,
    input.customInstructions
  );

  // Step 3: Call OpenAI API
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: prompt,
      },
    ],
    max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: 0.1, // Low temperature for consistent extraction
  });

  // Step 4: Parse OpenAI response
  const responseText = completion.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('No response from OpenAI');
  }

  // Step 5: Extract leads from response
  const leads = parseLeadsFromResponse(responseText);

  // Step 6: Post-process and deduplicate leads
  const processedLeads = postProcessLeads(leads);

  // Step 7: Calculate token usage
  const tokens = {
    input: completion.usage?.prompt_tokens || 0,
    output: completion.usage?.completion_tokens || 0,
  };

  return {
    leads: processedLeads,
    tokens,
  };
}

/**
 * Helper function to extract leads from a single email
 * @param emailData - Email data for extraction
 * @returns Promise resolving to extraction result
 */
export async function extractFromEmail(emailData: {
  text: string;
  html?: string;
  links: Array<{ url: string; anchorText?: string }>;
  customInstructions?: string;
  userId: string;
  emailId: string;
}): Promise<ExtractionResult> {
  // Use text content, fallback to HTML if no text
  const emailText =
    emailData.text ||
    (emailData.html ? 'HTML content available' : 'No content');

  return extractJobLeads({
    emailText,
    rawLinks: emailData.links,
    customInstructions: emailData.customInstructions,
    userId: emailData.userId,
    emailId: emailData.emailId,
  });
}
