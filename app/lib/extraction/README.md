# Job Lead Extraction Module

This module provides AI-powered extraction of job leads from email content using OpenAI's Responses API with Structured Output.

## Overview

The extraction module analyzes email content and links to identify potential job opportunities, company information, and career-related resources. It uses intelligent filtering and AI analysis to classify links and extract relevant metadata.

## Features

- **URL Normalization**: Removes tracking parameters, fragments, and standardizes URLs
- **Pre-filtering**: Automatically filters out unsubscribe and tracking links
- **AI Classification**: Uses OpenAI to determine link types and extract job information
- **Deduplication**: Generates unique keys to prevent duplicate leads
- **Confidence Scoring**: AI provides confidence scores for each extraction
- **Custom Instructions**: Supports user-defined extraction rules

## Core Types

### `LeadCandidate`
Represents a potential job lead with extracted information:

```typescript
type LeadCandidate = {
  url: string;                    // Original URL
  normalizedUrl: string;          // Cleaned URL for deduplication
  type: 'job_posting' | 'job_list' | 'company' | 'unsubscribe' | 'tracking' | 'other';
  title?: string;                 // Job title if available
  company?: string;               // Company name if mentioned
  location?: string;              // Job location if specified
  dedupeKey?: string;             // Unique identifier for deduplication
  confidence: number;             // AI confidence score (0.0 to 1.0)
  anchorText?: string;            // Link text from email
};
```

### `ExtractionInput`
Input data for the extraction process:

```typescript
interface ExtractionInput {
  emailText: string;              // Email content to analyze
  rawLinks: Array<{               // Links found in email
    url: string;
    anchorText?: string;
  }>;
  customInstructions?: string;     // Optional user-defined rules
  userId: string;                 // User ID for tracking
  emailId: string;                // Email ID for tracking
}
```

### `ExtractionResult`
Result of the extraction process:

```typescript
interface ExtractionResult {
  leads: LeadCandidate[];         // Extracted job leads
  tokens: {                       // OpenAI API token usage
    input: number;
    output: number;
  };
}
```

## Main Functions

### `extractJobLeads(input: ExtractionInput): Promise<ExtractionResult>`

Main extraction function that processes email content and links.

```typescript
import { extractJobLeads } from './extractJobLeads';

const result = await extractJobLeads({
  emailText: 'We have a great opportunity for a Frontend Developer...',
  rawLinks: [
    { url: 'https://company.com/jobs/frontend-dev', anchorText: 'Apply Now' },
    { url: 'https://company.com/careers', anchorText: 'See All Jobs' }
  ],
  customInstructions: 'Focus on engineering roles only',
  userId: 'user-123',
  emailId: 'email-456'
});

console.log(`Found ${result.leads.length} leads`);
console.log(`Used ${result.tokens.input + result.tokens.output} tokens`);
```

### `extractFromEmail(emailData): Promise<ExtractionResult>`

Helper function for extracting from email data with text/HTML content.

```typescript
import { extractFromEmail } from './extractJobLeads';

const result = await extractFromEmail({
  text: 'Email text content...',
  html: '<html>Email HTML...</html>',
  links: [{ url: 'https://example.com', anchorText: 'Link' }],
  customInstructions: 'Custom rules...',
  userId: 'user-123',
  emailId: 'email-456'
});
```

## URL Normalization

The module automatically normalizes URLs to improve deduplication:

### What Gets Removed:
- **Tracking Parameters**: `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`, etc.
- **Fragments**: Everything after `#` in URLs
- **Empty Query Strings**: `?` with no parameters

### What Gets Standardized:
- **Hostnames**: Converted to lowercase
- **URL Format**: Consistent structure for comparison

### Example:
```
Input:  https://company.com/jobs/dev?utm_source=email&fbclid=abc123#section
Output: https://company.com/jobs/dev
```

## Pre-filtering

Before sending to AI, the module filters out obvious non-job links:

### Unsubscribe Patterns:
- `unsubscribe`, `opt-out`, `remove`, `unsub`, `stop`, `cancel`
- Known unsubscribe domains: `mailchimp.com`, `constantcontact.com`, etc.

### Tracking Patterns:
- `tracking`, `pixel`, `beacon`, `analytics`, `monitor`
- Analytics domains and tracking URLs

## AI Classification

The OpenAI model analyzes each link and determines:

### Link Types:
- **`job_posting`**: Direct link to specific job posting/application
- **`job_list`**: Link to list of jobs (e.g., "See all jobs", "Browse careers")
- **`company`**: Company information, careers page, about page
- **`unsubscribe`**: Email unsubscribe links (rare after pre-filtering)
- **`tracking`**: Analytics/tracking links (rare after pre-filtering)
- **`other`**: Any other relevant link

### Extracted Information:
- **Job Title**: Position name if mentioned
- **Company**: Company name if available
- **Location**: Job location if specified
- **Confidence**: AI confidence in classification (0.0 to 1.0)

## Deduplication

Each lead gets a unique deduplication key:

### For Job Postings:
```
Company + Title → "techcorpinc_seniorfrontenddeveloper"
```

### For Other Types:
```
Normalized URL → "https://company.com/careers"
```

## Custom Instructions

Users can provide custom extraction rules:

```typescript
const customInstructions = `
- Focus on engineering and technical roles only
- Ignore marketing and sales positions
- Prioritize remote/hybrid opportunities
- Look for senior-level positions (5+ years experience)
`;
```

## API Testing

Use the `/api/extraction/run` endpoint for local testing:

### POST Request:
```json
{
  "emailText": "We have a great opportunity...",
  "rawLinks": [
    { "url": "https://company.com/jobs", "anchorText": "Apply" }
  ],
  "customInstructions": "Focus on engineering roles",
  "userId": "user-123",
  "emailId": "email-456"
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "url": "https://company.com/jobs",
        "normalizedUrl": "https://company.com/jobs",
        "type": "job_posting",
        "title": "Software Engineer",
        "company": "TechCorp",
        "confidence": 0.9
      }
    ],
    "tokens": { "input": 1250, "output": 450 }
  }
}
```

## Error Handling

The module includes comprehensive error handling:

- **API Key Validation**: Checks for OpenAI API key
- **Input Validation**: Validates required fields and data types
- **OpenAI Errors**: Handles API failures gracefully
- **URL Parsing**: Falls back gracefully for malformed URLs

## Performance Considerations

- **Token Usage**: Tracks OpenAI API token consumption
- **Batch Processing**: Can process multiple links in single API call
- **Caching**: Consider caching results for repeated extractions
- **Rate Limiting**: Respect OpenAI API rate limits

## Integration Examples

### With Email Sync:
```typescript
import { extractJobLeads } from './extractJobLeads';

// After processing email content
const extractionResult = await extractJobLeads({
  emailText: emailBodyText,
  rawLinks: extractedLinks,
  customInstructions: userSettings.customInstructions,
  userId: email.userId,
  emailId: email.id
});

// Process extracted leads
for (const lead of extractionResult.leads) {
  if (lead.confidence >= 0.7) {
    await saveJobLead(lead);
  }
}
```

### With Custom Filtering:
```typescript
// Filter high-quality leads
const highQualityLeads = extractionResult.leads.filter(lead => 
  lead.confidence >= 0.8 && 
  lead.type === 'job_posting' &&
  !!lead.company
);

console.log(`Found ${highQualityLeads.length} high-quality job leads`);
```

## Testing

Use the test file for examples and validation:

```typescript
import { runFullExample } from './extractJobLeads.test';

// Run complete example
const result = await runFullExample();
console.log('Example completed:', result.success);
```

## Notes

- **Environment Variables**: Requires `OPENAI_API_KEY` to be set
- **Model Selection**: Uses `gpt-4o-mini` for cost-effective processing
- **Structured Output**: Relies on OpenAI's structured output capabilities
- **Fallback Handling**: Gracefully handles API failures and malformed data
