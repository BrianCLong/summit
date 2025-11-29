/**
 * Content Service
 * Business logic for article content processing
 */

import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Initialize DOMPurify with jsdom for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window);

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: false,
});

export class ContentService {
  /**
   * Convert markdown to sanitized HTML
   */
  markdownToHtml(markdown: string): string {
    const rawHtml = marked.parse(markdown, { async: false }) as string;
    return this.sanitizeHtml(rawHtml);
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHtml(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
        'a', 'code', 'pre', 'blockquote',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'figure', 'figcaption',
        'div', 'span',
        'dl', 'dt', 'dd',
        'sup', 'sub',
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'class', 'id',
        'colspan', 'rowspan',
      ],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target'],
    });
  }

  /**
   * Extract plain text from HTML for search indexing
   */
  htmlToPlainText(html: string): string {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || '';
  }

  /**
   * Extract an excerpt from content
   */
  extractExcerpt(content: string, maxLength = 200): string {
    const plainText = this.htmlToPlainText(this.markdownToHtml(content));
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength).trim() + '...';
  }

  /**
   * Extract headings from markdown for table of contents
   */
  extractHeadings(markdown: string): Array<{ level: number; text: string; id: string }> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string; id: string }> = [];
    let match;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = this.slugify(text);
      headings.push({ level, text, id });
    }

    return headings;
  }

  /**
   * Create URL-friendly slug from text
   */
  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  /**
   * Validate markdown content
   */
  validateMarkdown(markdown: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for basic structure
    if (!markdown || markdown.trim().length === 0) {
      errors.push('Content cannot be empty');
    }

    // Check for potentially dangerous content
    if (/<script/i.test(markdown)) {
      errors.push('Script tags are not allowed');
    }

    if (/<iframe/i.test(markdown)) {
      errors.push('Iframe tags are not allowed');
    }

    if (/javascript:/i.test(markdown)) {
      errors.push('JavaScript URLs are not allowed');
    }

    if (/on\w+\s*=/i.test(markdown)) {
      errors.push('Event handlers are not allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Process content for storage
   */
  processContent(markdown: string): {
    content: string;
    contentHtml: string;
    excerpt: string;
    headings: Array<{ level: number; text: string; id: string }>;
  } {
    const validation = this.validateMarkdown(markdown);
    if (!validation.valid) {
      throw new Error(`Invalid content: ${validation.errors.join(', ')}`);
    }

    const contentHtml = this.markdownToHtml(markdown);
    const excerpt = this.extractExcerpt(markdown);
    const headings = this.extractHeadings(markdown);

    return {
      content: markdown,
      contentHtml,
      excerpt,
      headings,
    };
  }
}

export const contentService = new ContentService();
