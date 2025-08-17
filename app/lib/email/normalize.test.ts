import {
  extractLinks,
  extractPlainText,
  cleanHtml,
  normalizeUrl,
} from './normalize';

describe('Email Normalization', () => {
  describe('extractPlainText', () => {
    it('should extract plain text from text/plain payload', () => {
      const payload = {
        mimeType: 'text/plain',
        body: { data: Buffer.from('Hello World').toString('base64') },
      };

      const result = extractPlainText(payload);
      expect(result).toBe('Hello World');
    });

    it('should convert HTML to text', () => {
      const payload = {
        mimeType: 'text/html',
        body: {
          data: Buffer.from('<h1>Title</h1><p>Content</p>').toString('base64'),
        },
      };

      const result = extractPlainText(payload);
      expect(result).toContain('Title');
      expect(result).toContain('Content');
      expect(result).not.toContain('<h1>');
    });

    it('should handle nested parts', () => {
      const payload = {
        parts: [
          {
            mimeType: 'text/plain',
            body: { data: Buffer.from('Plain text').toString('base64') },
          },
        ],
      };

      const result = extractPlainText(payload);
      expect(result).toBe('Plain text');
    });
  });

  describe('cleanHtml', () => {
    it('should remove script tags', () => {
      const html = '<script>alert("test")</script><p>Content</p>';
      const result = cleanHtml(html);

      expect(result).not.toContain('alert("test")');
      expect(result).toContain('Content');
    });

    it('should remove style tags', () => {
      const html = '<style>body { color: red; }</style><p>Content</p>';
      const result = cleanHtml(html);

      expect(result).not.toContain('color: red');
      expect(result).toContain('Content');
    });

    it('should convert HTML entities', () => {
      const html = '<p>Hello &amp; World</p>';
      const result = cleanHtml(html);

      expect(result).toContain('Hello & World');
    });
  });

  describe('extractLinks', () => {
    it('should extract links from HTML with anchor text', () => {
      const input = {
        html: '<a href="https://example.com/jobs">View Jobs</a>',
      };

      const links = extractLinks(input);

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('https://example.com/jobs');
      expect(links[0].anchorText).toBe('View Jobs');
      expect(links[0].type).toBe('job_list');
    });

    it('should classify job posting links correctly', () => {
      const input = {
        html: '<a href="https://seek.com.au/jobs/123">Apply Now</a>',
      };

      const links = extractLinks(input);

      expect(links[0].type).toBe('job_posting');
      expect(links[0].domain).toBe('seek.com.au');
    });

    it('should classify unsubscribe links correctly', () => {
      const input = {
        html: '<a href="https://newsletter.com/unsubscribe">Unsubscribe</a>',
      };

      const links = extractLinks(input);

      expect(links[0].type).toBe('unsubscribe');
      expect(links[0].isUnsubscribe).toBe(true);
    });

    it('should classify tracking links correctly', () => {
      const input = {
        html: '<a href="https://tracking.com/click/abc123">Click here</a>',
      };

      const links = extractLinks(input);

      expect(links[0].type).toBe('tracking');
      expect(links[0].isTracking).toBe(true);
    });

    it('should deduplicate links by normalized URL', () => {
      const input = {
        html: `
          <a href="https://example.com/jobs?utm_source=email">Jobs</a>
          <a href="https://example.com/jobs">Jobs</a>
        `,
      };

      const links = extractLinks(input);

      expect(links).toHaveLength(1);
      expect(links[0].normalizedUrl).toBe('https://example.com/jobs');
    });

    it('should extract links from both HTML and text', () => {
      const input = {
        html: '<a href="https://example.com/jobs">Jobs</a>',
        text: 'Check out https://linkedin.com/careers',
      };

      const links = extractLinks(input);

      expect(links).toHaveLength(2);
      expect(links.some((l) => l.domain === 'example.com')).toBe(true);
      expect(links.some((l) => l.domain === 'linkedin.com')).toBe(true);
    });
  });

  describe('URL normalization', () => {
    it('should remove tracking parameters', () => {
      const url =
        'https://example.com/jobs?utm_source=email&utm_campaign=jobs&id=123';
      const normalized = normalizeUrl(url);

      expect(normalized).not.toContain('utm_source');
      expect(normalized).not.toContain('utm_campaign');
      expect(normalized).toContain('id=123');
    });

    it('should remove fragments', () => {
      const url = 'https://example.com/jobs#section';
      const normalized = normalizeUrl(url);

      expect(normalized).not.toContain('#');
    });

    it('should remove empty query string after cleaning', () => {
      const url = 'https://example.com/jobs?utm_source=email';
      const normalized = normalizeUrl(url);

      expect(normalized).not.toContain('?');
    });
  });

  describe('Link classification heuristics', () => {
    it('should identify job list links by anchor text', () => {
      const input = {
        html: '<a href="https://company.com/careers">See all jobs</a>',
      };

      const links = extractLinks(input);

      expect(links[0].type).toBe('job_list');
      expect(links[0].isLikelyJobList).toBe(true);
    });

    it('should identify job list links by URL path', () => {
      const input = {
        html: '<a href="https://company.com/careers/">Careers</a>',
      };

      const links = extractLinks(input);

      expect(links[0].type).toBe('job_list');
      expect(links[0].isLikelyJobList).toBe(true);
    });

    it('should identify company links', () => {
      const input = {
        html: '<a href="https://company.com/about">About Us</a>',
      };

      const links = extractLinks(input);

      expect(links[0].type).toBe('company');
    });

    it('should handle invalid URLs gracefully', () => {
      const input = {
        html: '<a href="not-a-url">Invalid</a>',
      };

      const links = extractLinks(input);

      expect(links).toHaveLength(0);
    });

    // Enhanced heuristics tests
    it('should classify job posting links by domain patterns', () => {
      const jobDomains = [
        'https://seek.com.au/jobs/123',
        'https://linkedin.com/jobs/456',
        'https://greenhouse.io/jobs/789',
        'https://workable.com/jobs/abc',
        'https://lever.co/jobs/def',
      ];

      jobDomains.forEach((url) => {
        const input = { html: `<a href="${url}">Apply</a>` };
        const links = extractLinks(input);
        expect(links[0].type).toBe('job_posting');
      });
    });

    it('should classify job posting links by URL path patterns', () => {
      const jobPaths = [
        'https://company.com/careers/123',
        'https://company.com/jobs/456',
        'https://company.com/position/789',
        'https://company.com/opening/abc',
        'https://company.com/apply/def',
      ];

      jobPaths.forEach((url) => {
        const input = { html: `<a href="${url}">Apply</a>` };
        const links = extractLinks(input);
        expect(links[0].type).toBe('job_posting');
      });
    });

    it('should classify job list links by anchor text patterns', () => {
      const jobListTexts = [
        'See all jobs',
        'Browse careers',
        'View all positions',
        'More opportunities',
        'Career opportunities',
        'Open positions',
      ];

      jobListTexts.forEach((text) => {
        const input = {
          html: `<a href="https://company.com/careers">${text}</a>`,
        };
        const links = extractLinks(input);
        expect(links[0].type).toBe('job_list');
        expect(links[0].isLikelyJobList).toBe(true);
      });
    });

    it('should classify company links by URL path patterns', () => {
      const companyPaths = [
        'https://company.com/about',
        'https://company.com/company',
        'https://company.com/team',
        'https://company.com/culture',
        'https://company.com/values',
        'https://company.com/contact',
      ];

      companyPaths.forEach((url) => {
        const input = { html: `<a href="${url}">Link</a>` };
        const links = extractLinks(input);
        expect(links[0].type).toBe('company');
      });
    });

    it('should classify unsubscribe links by anchor text patterns', () => {
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
        const input = {
          html: `<a href="https://newsletter.com/unsub">${text}</a>`,
        };
        const links = extractLinks(input);
        expect(links[0].type).toBe('unsubscribe');
        expect(links[0].isUnsubscribe).toBe(true);
      });
    });

    it('should classify tracking links by domain patterns', () => {
      const trackingDomains = [
        'https://go.redirectingat.com/abc123',
        'https://click.email/def456',
        'https://track.email/ghi789',
        'https://links.email/jkl012',
        'https://click.newsletter/mno345',
      ];

      trackingDomains.forEach((url) => {
        const input = { html: `<a href="${url}">Click here</a>` };
        const links = extractLinks(input);
        expect(links[0].type).toBe('tracking');
        expect(links[0].isTracking).toBe(true);
      });
    });

    it('should classify tracking links by URL path patterns', () => {
      const trackingPaths = [
        'https://company.com/click/abc123',
        'https://company.com/track/def456',
        'https://company.com/go/ghi789',
        'https://company.com/link/jkl012',
        'https://company.com/redirect/mno345',
      ];

      trackingPaths.forEach((url) => {
        const input = { html: `<a href="${url}">Click here</a>` };
        const links = extractLinks(input);
        expect(links[0].type).toBe('tracking');
        expect(links[0].isTracking).toBe(true);
      });
    });

    it('should handle mixed content with various link types', () => {
      const input = {
        html: `
          <a href="https://company.com/jobs/123">Apply Now</a>
          <a href="https://company.com/careers">See All Jobs</a>
          <a href="https://company.com/about">About Us</a>
          <a href="https://newsletter.com/unsubscribe">Unsubscribe</a>
          <a href="https://tracking.com/click/abc123">Click here</a>
        `,
      };

      const links = extractLinks(input);

      expect(links).toHaveLength(5);
      expect(links.find((l) => l.type === 'job_posting')).toBeDefined();
      expect(links.find((l) => l.type === 'job_list')).toBeDefined();
      expect(links.find((l) => l.type === 'company')).toBeDefined();
      expect(links.find((l) => l.type === 'unsubscribe')).toBeDefined();
      expect(links.find((l) => l.type === 'tracking')).toBeDefined();
    });

    it('should prioritize job-related classifications over generic ones', () => {
      const input = {
        html: '<a href="https://company.com/careers">See all jobs</a>',
      };

      const links = extractLinks(input);

      // Should be classified as job_list, not company
      expect(links[0].type).toBe('job_list');
      expect(links[0].isLikelyJobList).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { html: '<a href="">Empty href</a>', expectedLength: 0 },
        { html: '<a href="javascript:void(0)">JS link</a>', expectedLength: 1 }, // javascript:void(0) is treated as a valid URL
        {
          html: '<a href="mailto:test@example.com">Email link</a>',
          expectedLength: 1,
        }, // mailto links are treated as valid URLs
        { html: '<a href="tel:+1234567890">Phone link</a>', expectedLength: 1 }, // tel links are treated as valid URLs
        { html: '<a href="ftp://example.com">FTP link</a>', expectedLength: 1 },
      ];

      edgeCases.forEach(({ html, expectedLength }) => {
        const input = { html };
        const links = extractLinks(input);
        expect(links).toHaveLength(expectedLength);
      });
    });
  });

  describe('URL normalization edge cases', () => {
    it('should handle URLs with multiple tracking parameters', () => {
      const url =
        'https://example.com/jobs?utm_source=email&utm_medium=web&utm_campaign=jobs&utm_term=developer&utm_content=banner&fbclid=abc123&gclid=def456&ref=123';
      const normalized = normalizeUrl(url);

      expect(normalized).toBe('https://example.com/jobs?ref=123');
    });

    it('should handle URLs with mixed valid and tracking parameters', () => {
      const url =
        'https://example.com/jobs?jobId=123&utm_source=email&location=sydney&utm_campaign=jobs&department=engineering';
      const normalized = normalizeUrl(url);

      expect(normalized).toBe(
        'https://example.com/jobs?jobId=123&location=sydney&department=engineering'
      );
    });

    it('should handle URLs with fragments and tracking', () => {
      const url = 'https://example.com/jobs?utm_source=email#section';
      const normalized = normalizeUrl(url);

      expect(normalized).toBe('https://example.com/jobs');
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        'ftp://invalid',
        'mailto:test@example.com',
      ];

      malformedUrls.forEach((url) => {
        const normalized = normalizeUrl(url);
        // Should return cleaned version or original if parsing fails
        expect(typeof normalized).toBe('string');
      });
    });
  });
});
