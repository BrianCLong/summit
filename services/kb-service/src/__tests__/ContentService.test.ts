/**
 * Content Service Tests
 * Tests for markdown processing and content validation
 */

import { contentService } from '../services/ContentService.js';

describe('ContentService', () => {
  describe('markdownToHtml', () => {
    it('should convert simple markdown to HTML', () => {
      const markdown = '# Hello World';
      const html = contentService.markdownToHtml(markdown);
      expect(html).toContain('<h1>');
      expect(html).toContain('Hello World');
    });

    it('should convert lists to HTML', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const html = contentService.markdownToHtml(markdown);
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
      expect(html).toContain('Item 1');
    });

    it('should convert code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const html = contentService.markdownToHtml(markdown);
      expect(html).toContain('<code>');
      expect(html).toContain('const x = 1;');
    });

    it('should convert tables', () => {
      const markdown = '| Col 1 | Col 2 |\n|-------|-------|\n| A | B |';
      const html = contentService.markdownToHtml(markdown);
      expect(html).toContain('<table>');
      expect(html).toContain('<th>');
      expect(html).toContain('<td>');
    });

    it('should sanitize dangerous HTML', () => {
      const markdown = '<script>alert("xss")</script>';
      const html = contentService.markdownToHtml(markdown);
      expect(html).not.toContain('<script>');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const sanitized = contentService.sanitizeHtml(html);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });

    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const sanitized = contentService.sanitizeHtml(html);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const html = '<img src="x" onerror="alert(1)">';
      const sanitized = contentService.sanitizeHtml(html);
      expect(sanitized).not.toContain('onerror');
    });

    it('should remove iframe tags', () => {
      const html = '<iframe src="http://evil.com"></iframe>';
      const sanitized = contentService.sanitizeHtml(html);
      expect(sanitized).not.toContain('<iframe>');
    });
  });

  describe('htmlToPlainText', () => {
    it('should extract text from HTML', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const text = contentService.htmlToPlainText(html);
      expect(text).toBe('Hello world');
    });

    it('should handle nested elements', () => {
      const html = '<div><p>Line 1</p><p>Line 2</p></div>';
      const text = contentService.htmlToPlainText(html);
      expect(text).toContain('Line 1');
      expect(text).toContain('Line 2');
    });
  });

  describe('extractExcerpt', () => {
    it('should extract short content as-is', () => {
      const content = 'Short content';
      const excerpt = contentService.extractExcerpt(content, 200);
      expect(excerpt).toBe('Short content');
    });

    it('should truncate long content', () => {
      const content = 'A'.repeat(300);
      const excerpt = contentService.extractExcerpt(content, 100);
      expect(excerpt.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(excerpt).toEndWith('...');
    });

    it('should handle markdown content', () => {
      const content = '# Title\n\nThis is the body content.';
      const excerpt = contentService.extractExcerpt(content, 200);
      expect(excerpt).toContain('Title');
      expect(excerpt).toContain('body content');
    });
  });

  describe('extractHeadings', () => {
    it('should extract all heading levels', () => {
      const markdown = '# H1\n## H2\n### H3';
      const headings = contentService.extractHeadings(markdown);

      expect(headings).toHaveLength(3);
      expect(headings[0]).toEqual({ level: 1, text: 'H1', id: 'h1' });
      expect(headings[1]).toEqual({ level: 2, text: 'H2', id: 'h2' });
      expect(headings[2]).toEqual({ level: 3, text: 'H3', id: 'h3' });
    });

    it('should generate slugs for headings', () => {
      const markdown = '# Hello World';
      const headings = contentService.extractHeadings(markdown);

      expect(headings[0].id).toBe('hello-world');
    });

    it('should handle special characters in headings', () => {
      const markdown = '# Hello & Goodbye!';
      const headings = contentService.extractHeadings(markdown);

      expect(headings[0].id).toBe('hello-goodbye');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(contentService.slugify('HELLO')).toBe('hello');
    });

    it('should replace spaces with hyphens', () => {
      expect(contentService.slugify('hello world')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(contentService.slugify('hello@world!')).toBe('helloworld');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(contentService.slugify('  hello  ')).toBe('hello');
    });

    it('should limit slug length', () => {
      const longText = 'a'.repeat(150);
      const slug = contentService.slugify(longText);
      expect(slug.length).toBeLessThanOrEqual(100);
    });
  });

  describe('validateMarkdown', () => {
    it('should accept valid markdown', () => {
      const result = contentService.validateMarkdown('# Hello\n\nWorld');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const result = contentService.validateMarkdown('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content cannot be empty');
    });

    it('should reject script tags', () => {
      const result = contentService.validateMarkdown('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Script tags are not allowed');
    });

    it('should reject iframe tags', () => {
      const result = contentService.validateMarkdown('<iframe src="x"></iframe>');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Iframe tags are not allowed');
    });

    it('should reject javascript URLs', () => {
      const result = contentService.validateMarkdown('[click](javascript:alert(1))');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('JavaScript URLs are not allowed');
    });

    it('should reject event handlers', () => {
      const result = contentService.validateMarkdown('<img onclick="alert(1)">');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Event handlers are not allowed');
    });
  });

  describe('processContent', () => {
    it('should process valid content', () => {
      const markdown = '# Title\n\nBody content here.';
      const result = contentService.processContent(markdown);

      expect(result.content).toBe(markdown);
      expect(result.contentHtml).toContain('<h1>');
      expect(result.excerpt).toContain('Title');
      expect(result.headings).toHaveLength(1);
    });

    it('should throw on invalid content', () => {
      expect(() => {
        contentService.processContent('<script>alert(1)</script>');
      }).toThrow('Invalid content');
    });
  });
});
