/**
 * Test file demonstrating job lead extraction functionality
 * This file shows how to use the extractJobLeads function
 */

import { extractJobLeads, LeadCandidate } from './extractJobLeads';

// Mock data for testing
const sampleEmailData = {
  emailText: `Hi there!

We have an exciting opportunity for a Senior Frontend Developer at TechCorp.

Position: Senior Frontend Developer
Location: Sydney, Australia (Hybrid)
Company: TechCorp Inc.

We're looking for someone with React, TypeScript, and modern web development experience.

Please check out the job posting and apply if you're interested!

Best regards,
HR Team`,
  rawLinks: [
    {
      url: 'https://techcorp.com/jobs/senior-frontend-developer?utm_source=email&utm_campaign=job_post',
      anchorText: 'Apply Now'
    },
    {
      url: 'https://techcorp.com/careers',
      anchorText: 'See All Jobs'
    },
    {
      url: 'https://techcorp.com/about',
      anchorText: 'About Us'
    },
    {
      url: 'https://mailchimp.com/unsubscribe?e=abc123',
      anchorText: 'Unsubscribe'
    },
    {
      url: 'https://analytics.google.com/track?event=email_open',
      anchorText: ''
    }
  ],
  customInstructions: 'Focus on engineering and technical roles. Ignore marketing positions.',
  userId: 'test-user-123',
  emailId: 'test-email-456'
};

// Example of running extraction (commented out to avoid API calls during testing)
export async function runExtractionExample() {
  try {
    console.log('=== Job Lead Extraction Example ===');
    console.log('Input:', {
      emailLength: sampleEmailData.emailText.length,
      linkCount: sampleEmailData.rawLinks.length,
      hasCustomInstructions: !!sampleEmailData.customInstructions
    });

    // Note: This would make an actual OpenAI API call
    // const result = await extractJobLeads(sampleEmailData);
    
    // For testing purposes, return mock result
    const mockResult = {
      leads: [
        {
          url: 'https://techcorp.com/jobs/senior-frontend-developer?utm_source=email&utm_campaign=job_post',
          normalizedUrl: 'https://techcorp.com/jobs/senior-frontend-developer',
          type: 'job_posting' as const,
          title: 'Senior Frontend Developer',
          company: 'TechCorp Inc.',
          location: 'Sydney, Australia',
          dedupeKey: 'techcorpinc_seniorfrontenddeveloper',
          confidence: 0.95,
          anchorText: 'Apply Now'
        },
        {
          url: 'https://techcorp.com/careers',
          normalizedUrl: 'https://techcorp.com/careers',
          type: 'job_list' as const,
          title: undefined,
          company: 'TechCorp Inc.',
          location: undefined,
          dedupeKey: 'https://techcorp.com/careers',
          confidence: 0.85,
          anchorText: 'See All Jobs'
        },
        {
          url: 'https://techcorp.com/about',
          normalizedUrl: 'https://techcorp.com/about',
          type: 'company' as const,
          title: undefined,
          company: 'TechCorp Inc.',
          location: undefined,
          dedupeKey: 'https://techcorp.com/about',
          confidence: 0.80,
          anchorText: 'About Us'
        }
      ],
      tokens: {
        input: 1250,
        output: 450
      }
    };

    console.log('Extraction Result:', {
      leadsFound: mockResult.leads.length,
      tokenUsage: mockResult.tokens,
      leads: mockResult.leads.map(lead => ({
        type: lead.type,
        title: lead.title || 'N/A',
        company: lead.company || 'N/A',
        confidence: lead.confidence,
        dedupeKey: lead.dedupeKey
      }))
    });

    return mockResult;

  } catch (error) {
    console.error('Extraction example failed:', error);
    throw error;
  }
}

// Example of processing extraction results
export function processExtractionResults(leads: LeadCandidate[]) {
  console.log('\n=== Processing Extraction Results ===');
  
  // Group leads by type
  const leadsByType = leads.reduce((acc, lead) => {
    if (!acc[lead.type]) {
      acc[lead.type] = [];
    }
    acc[lead.type].push(lead);
    return acc;
  }, {} as Record<string, LeadCandidate[]>);

  console.log('Leads by type:');
  Object.entries(leadsByType).forEach(([type, typeLeads]) => {
    console.log(`  ${type}: ${typeLeads.length} leads`);
  });

  // Find high-confidence job postings
  const highConfidenceJobs = leads.filter(
    lead => lead.type === 'job_posting' && lead.confidence >= 0.8
  );

  console.log(`\nHigh-confidence job postings (≥0.8): ${highConfidenceJobs.length}`);
  highConfidenceJobs.forEach(job => {
    console.log(`  - ${job.title} at ${job.company} (${job.confidence})`);
  });

  // Generate deduplication report
  const dedupeKeys = new Set(leads.map(lead => lead.dedupeKey));
  console.log(`\nUnique deduplication keys: ${dedupeKeys.size}`);
  
  // Check for potential duplicates
  const duplicateKeys = leads.filter(lead => 
    leads.filter(l => l.dedupeKey === lead.dedupeKey).length > 1
  );
  
  if (duplicateKeys.length > 0) {
    console.log(`\nPotential duplicates found: ${duplicateKeys.length} leads`);
    duplicateKeys.forEach(lead => {
      console.log(`  - ${lead.url} (${lead.dedupeKey})`);
    });
  }

  return {
    leadsByType,
    highConfidenceJobs,
    uniqueKeys: dedupeKeys.size,
    potentialDuplicates: duplicateKeys.length
  };
}

// Example of filtering leads based on criteria
export function filterLeads(leads: LeadCandidate[], criteria: {
  minConfidence?: number;
  types?: string[];
  hasCompany?: boolean;
  hasLocation?: boolean;
}) {
  console.log('\n=== Filtering Leads ===');
  console.log('Criteria:', criteria);
  
  let filtered = leads;

  if (criteria.minConfidence !== undefined) {
    filtered = filtered.filter(lead => lead.confidence >= criteria.minConfidence!);
    console.log(`After confidence filter (≥${criteria.minConfidence}): ${filtered.length} leads`);
  }

  if (criteria.types && criteria.types.length > 0) {
    filtered = filtered.filter(lead => criteria.types!.includes(lead.type));
    console.log(`After type filter (${criteria.types.join(', ')}): ${filtered.length} leads`);
  }

  if (criteria.hasCompany) {
    filtered = filtered.filter(lead => !!lead.company);
    console.log(`After company filter: ${filtered.length} leads`);
  }

  if (criteria.hasLocation) {
    filtered = filtered.filter(lead => !!lead.location);
    console.log(`After location filter: ${filtered.length} leads`);
  }

  return filtered;
}

// Example of generating summary statistics
export function generateExtractionStats(leads: LeadCandidate[]) {
  console.log('\n=== Extraction Statistics ===');
  
  const stats = {
    totalLeads: leads.length,
    byType: {} as Record<string, number>,
    byConfidence: {
      high: leads.filter(l => l.confidence >= 0.8).length,
      medium: leads.filter(l => l.confidence >= 0.5 && l.confidence < 0.8).length,
      low: leads.filter(l => l.confidence < 0.5).length
    },
    withCompany: leads.filter(l => !!l.company).length,
    withLocation: leads.filter(l => !!l.location).length,
    withTitle: leads.filter(l => !!l.title).length,
    averageConfidence: leads.reduce((sum, l) => sum + l.confidence, 0) / leads.length
  };

  // Count by type
  leads.forEach(lead => {
    stats.byType[lead.type] = (stats.byType[lead.type] || 0) + 1;
  });

  console.log('Statistics:', stats);
  
  return stats;
}

// Main example function
export async function runFullExample() {
  try {
    console.log('🚀 Starting Job Lead Extraction Example\n');
    
    // Run extraction
    const result = await runExtractionExample();
    
    // Process results
    processExtractionResults(result.leads);
    
    // Filter leads
    const highQualityLeads = filterLeads(result.leads, {
      minConfidence: 0.7,
      types: ['job_posting', 'job_list'],
      hasCompany: true
    });
    
    console.log(`\nHigh-quality leads for processing: ${highQualityLeads.length}`);
    
    // Generate statistics
    generateExtractionStats(result.leads);
    
    console.log('\n✅ Example completed successfully!');
    
    return {
      success: true,
      totalLeads: result.leads.length,
      highQualityLeads: highQualityLeads.length,
      tokenUsage: result.tokens
    };
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for use in other modules
export { sampleEmailData };
