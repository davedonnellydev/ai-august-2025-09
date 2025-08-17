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
  });
});
