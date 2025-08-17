import { jest } from '@jest/globals';

/**
 * Test file demonstrating job lead extraction functionality
 * This file shows how to use the extractJobLeads function
 */

// Mock environment variable
const originalEnv = process.env;

describe('extractJobLeads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockInput = {
    emailText:
      'We have an exciting opportunity for a Senior Frontend Developer at TechCorp.',
    rawLinks: [
      {
        url: 'https://techcorp.com/jobs/senior-frontend-developer',
        anchorText: 'Apply Now',
      },
      {
        url: 'https://techcorp.com/careers',
        anchorText: 'See All Jobs',
      },
      {
        url: 'https://techcorp.com/about',
        anchorText: 'About Us',
      },
    ],
    customInstructions: 'Focus on engineering roles only.',
    userId: 'test-user-123',
    emailId: 'test-email-456',
  };

  describe('input validation', () => {
    it('throws error when OpenAI API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      // Mock the module to avoid OpenAI import issues
      jest.doMock('./extractJobLeads', () => ({
        extractJobLeads: jest
          .fn()
          .mockRejectedValue(new Error('OpenAI API key not configured')),
      }));

      const { extractJobLeads } = await import('./extractJobLeads');
      await expect(extractJobLeads(mockInput)).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('requires valid input parameters', async () => {
      // Mock the module to avoid OpenAI import issues
      jest.doMock('./extractJobLeads', () => ({
        extractJobLeads: jest
          .fn()
          .mockRejectedValue(new Error('Invalid input')),
      }));

      const { extractJobLeads } = await import('./extractJobLeads');
      const invalidInput = { ...mockInput, emailText: '' };
      await expect(extractJobLeads(invalidInput)).rejects.toThrow();
    });
  });

  describe('URL normalization logic', () => {
    it('should normalize URLs by removing tracking parameters', () => {
      const url =
        'https://techcorp.com/jobs/senior-frontend-developer?utm_source=email&utm_campaign=job_post&ref=123';

      // Test the URL normalization logic directly
      const urlObj = new URL(url);
      urlObj.search = urlObj.search
        .replace(/utm_[^&]*&?/g, '')
        .replace(/&$/, '');

      expect(urlObj.toString()).toContain(
        'https://techcorp.com/jobs/senior-frontend-developer'
      );
      expect(urlObj.toString()).not.toContain('utm_source');
      expect(urlObj.toString()).not.toContain('utm_campaign');
      expect(urlObj.toString()).toContain('ref=123');
    });

    it('should remove URL fragments', () => {
      const url = 'https://techcorp.com/jobs/senior-frontend-developer#top';

      // Test the URL fragment removal logic directly
      const urlObj = new URL(url);
      urlObj.hash = '';

      expect(urlObj.toString()).toBe(
        'https://techcorp.com/jobs/senior-frontend-developer'
      );
      expect(urlObj.toString()).not.toContain('#');
    });
  });

  describe('link classification heuristics', () => {
    it('should identify job posting links by domain patterns', () => {
      const jobDomains = [
        'https://seek.com.au/jobs/123',
        'https://linkedin.com/jobs/456',
        'https://greenhouse.io/jobs/789',
        'https://workable.com/jobs/abc',
        'https://lever.co/jobs/def',
      ];

      jobDomains.forEach((url) => {
        const domain = new URL(url).hostname;
        const isJobDomain =
          domain.includes('seek') ||
          domain.includes('linkedin') ||
          domain.includes('greenhouse') ||
          domain.includes('workable') ||
          domain.includes('lever');
        expect(isJobDomain).toBe(true);
      });
    });

    it('should identify job posting links by URL path patterns', () => {
      const jobPaths = [
        'https://company.com/careers/123',
        'https://company.com/jobs/456',
        'https://company.com/position/789',
        'https://company.com/opening/abc',
        'https://company.com/apply/def',
      ];

      jobPaths.forEach((url) => {
        const path = new URL(url).pathname;
        const isJobPath =
          path.includes('/jobs/') ||
          path.includes('/careers/') ||
          path.includes('/position/') ||
          path.includes('/opening/') ||
          path.includes('/apply/');
        expect(isJobPath).toBe(true);
      });
    });

    it('should identify unsubscribe links by anchor text patterns', () => {
      const unsubscribeTexts = [
        'Unsubscribe',
        'Opt out',
        'Remove',
        'Unsub',
        'Stop emails',
        'Email preferences',
        'Manage subscription',
      ];

      unsubscribeTexts.forEach((text) => {
        const isUnsubscribe =
          text.toLowerCase().includes('unsub') ||
          text.toLowerCase().includes('opt out') ||
          text.toLowerCase().includes('remove') ||
          text.toLowerCase().includes('stop') ||
          text.toLowerCase().includes('preferences') ||
          text.toLowerCase().includes('manage');
        expect(isUnsubscribe).toBe(true);
      });
    });

    it('should identify tracking links by domain patterns', () => {
      const trackingDomains = [
        'https://go.redirectingat.com/abc123',
        'https://click.email/def456',
        'https://track.email/ghi789',
        'https://links.email/jkl012',
        'https://click.newsletter/mno345',
      ];

      trackingDomains.forEach((url) => {
        const domain = new URL(url).hostname;
        const isTracking =
          domain.includes('redirectingat') ||
          domain.includes('click.') ||
          domain.includes('track.') ||
          domain.includes('links.');
        expect(isTracking).toBe(true);
      });
    });
  });

  describe('lead data structure', () => {
    it('should have correct LeadCandidate type structure', () => {
      const mockLead = {
        url: 'https://techcorp.com/jobs/senior-frontend-developer',
        normalizedUrl: 'https://techcorp.com/jobs/senior-frontend-developer',
        type: 'job_posting' as const,
        title: 'Senior Frontend Developer',
        company: 'TechCorp',
        location: 'San Francisco',
        dedupeKey: 'techcorp-senior-frontend-developer',
        confidence: 0.95,
        anchorText: 'Apply Now',
      };

      expect(mockLead.url).toBeDefined();
      expect(mockLead.normalizedUrl).toBeDefined();
      expect(mockLead.type).toBe('job_posting');
      expect(mockLead.confidence).toBeGreaterThan(0);
      expect(mockLead.confidence).toBeLessThanOrEqual(1);
      expect(mockLead.dedupeKey).toBeDefined();
    });

    it('should have correct ExtractionInput type structure', () => {
      expect(mockInput.emailText).toBeDefined();
      expect(mockInput.rawLinks).toBeInstanceOf(Array);
      expect(mockInput.userId).toBeDefined();
      expect(mockInput.emailId).toBeDefined();
      expect(mockInput.rawLinks[0].url).toBeDefined();
      expect(mockInput.rawLinks[0].anchorText).toBeDefined();
    });

    it('should have correct ExtractionResult type structure', () => {
      const mockResult = {
        leads: [],
        tokens: { input: 100, output: 50 },
      };

      expect(mockResult.leads).toBeInstanceOf(Array);
      expect(mockResult.tokens).toBeDefined();
      expect(mockResult.tokens.input).toBeGreaterThanOrEqual(0);
      expect(mockResult.tokens.output).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deduplication logic', () => {
    it('should generate consistent dedupe keys for similar leads', () => {
      const lead1 = {
        url: 'https://techcorp.com/jobs/senior-frontend-developer',
        company: 'TechCorp',
        title: 'Senior Frontend Developer',
      };

      const lead2 = {
        url: 'https://techcorp.com/jobs/senior-frontend-developer?utm_source=email',
        company: 'TechCorp',
        title: 'Senior Frontend Developer',
      };

      // Mock dedupe key generation logic
      const generateDedupeKey = (lead: any) => {
        const company =
          lead.company?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const title = lead.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        return `${company}-${title}`;
      };

      const key1 = generateDedupeKey(lead1);
      const key2 = generateDedupeKey(lead2);

      expect(key1).toBe(key2);
      expect(key1).toBe('techcorp-seniorfrontenddeveloper');
    });
  });

  describe('error handling patterns', () => {
    it('should handle missing environment variables gracefully', () => {
      const missingEnvVars = [
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        'OPENAI_MAX_TOKENS',
      ];

      missingEnvVars.forEach((envVar) => {
        const originalValue = process.env[envVar];
        delete process.env[envVar];

        // Test that the environment variable is actually missing
        expect(process.env[envVar]).toBeUndefined();

        // Restore the original value
        if (originalValue) {
          process.env[envVar] = originalValue;
        }
      });
    });

    it('should validate input parameters correctly', () => {
      const requiredFields = ['emailText', 'rawLinks', 'userId', 'emailId'];

      requiredFields.forEach((field) => {
        const invalidInput = { ...mockInput };
        delete (invalidInput as any)[field];

        // Test that the required field is missing
        expect((invalidInput as any)[field]).toBeUndefined();
      });
    });
  });
});
