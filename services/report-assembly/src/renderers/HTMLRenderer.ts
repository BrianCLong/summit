/**
 * HTMLRenderer - Renders briefing packages to HTML format
 */

import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import type { RenderContext, RenderResult, ExportOptions } from '../types.js';
import { TemplateEngine } from '../templates/TemplateEngine.js';

export interface HTMLRenderOptions {
  sanitize: boolean;
  parseMarkdown: boolean;
  includeStyles: boolean;
  inlineStyles: boolean;
}

const defaultOptions: HTMLRenderOptions = {
  sanitize: true,
  parseMarkdown: true,
  includeStyles: true,
  inlineStyles: false,
};

export class HTMLRenderer {
  private readonly templateEngine: TemplateEngine;

  constructor(templateEngine?: TemplateEngine) {
    this.templateEngine = templateEngine || new TemplateEngine();
  }

  /**
   * Render briefing context to HTML
   */
  async render(
    context: RenderContext,
    templateId: string,
    options: Partial<HTMLRenderOptions> = {},
  ): Promise<RenderResult> {
    const opts = { ...defaultOptions, ...options };

    // Render using template engine
    let html = this.templateEngine.render(templateId, context);

    // Parse markdown content if enabled
    if (opts.parseMarkdown) {
      html = await this.processMarkdown(html);
    }

    // Sanitize HTML if enabled
    if (opts.sanitize) {
      html = this.sanitize(html);
    }

    // Generate filename
    const filename = this.generateFilename(context, 'html');

    return {
      content: html,
      format: 'html',
      mimeType: 'text/html',
      filename,
      metadata: {
        templateId,
        generatedAt: context.generatedAt,
        classificationLevel: context.classificationLevel,
      },
    };
  }

  /**
   * Render custom HTML content
   */
  renderCustom(
    html: string,
    context: RenderContext,
    options: Partial<HTMLRenderOptions> = {},
  ): RenderResult {
    const opts = { ...defaultOptions, ...options };

    let content = html;

    if (opts.sanitize) {
      content = this.sanitize(content);
    }

    const filename = this.generateFilename(context, 'html');

    return {
      content,
      format: 'html',
      mimeType: 'text/html',
      filename,
      metadata: {
        generatedAt: context.generatedAt,
        classificationLevel: context.classificationLevel,
      },
    };
  }

  /**
   * Process markdown content within HTML
   */
  private async processMarkdown(html: string): Promise<string> {
    // Find markdown blocks and convert them
    const markdownPattern = /<markdown>([\s\S]*?)<\/markdown>/gi;

    let result = html;
    let match;

    while ((match = markdownPattern.exec(html)) !== null) {
      const markdownContent = match[1];
      const htmlContent = await marked.parse(markdownContent);
      result = result.replace(match[0], htmlContent);
    }

    return result;
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  private sanitize(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'img', 'figure', 'figcaption',
        'section', 'article', 'header', 'footer', 'nav',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'dl', 'dt', 'dd',
        'style', 'span', 'div',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['class', 'id', 'style', 'data-*'],
        img: ['src', 'alt', 'width', 'height'],
        a: ['href', 'target', 'rel'],
        table: ['class', 'border'],
      },
      allowedStyles: {
        '*': {
          'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i],
          'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i],
          'text-align': [/^(left|right|center|justify)$/],
          'font-size': [/^\d+(?:px|em|rem|%)$/],
          'font-weight': [/^(bold|normal|\d+)$/],
          'margin': [/.*/],
          'padding': [/.*/],
          'border': [/.*/],
          'width': [/.*/],
          'height': [/.*/],
        },
      },
    });
  }

  /**
   * Generate a filename for the rendered output
   */
  private generateFilename(context: RenderContext, extension: string): string {
    const sanitizedTitle = context.title
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);

    const timestamp = new Date().toISOString().split('T')[0];

    return `${sanitizedTitle}_${timestamp}.${extension}`;
  }

  /**
   * Add watermark to HTML
   */
  addWatermark(html: string, watermarkText: string): string {
    const watermarkStyle = `
      <style>
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 72px;
          color: rgba(0, 0, 0, 0.1);
          pointer-events: none;
          z-index: 9999;
          white-space: nowrap;
        }
      </style>
    `;

    const watermarkDiv = `<div class="watermark">${watermarkText}</div>`;

    // Insert before closing body tag
    return html.replace('</body>', `${watermarkStyle}${watermarkDiv}</body>`);
  }

  /**
   * Add table of contents to HTML
   */
  addTableOfContents(html: string): string {
    // Extract headings
    const headingPattern = /<h([2-4])[^>]*>([^<]+)<\/h\1>/gi;
    const headings: Array<{ level: number; text: string; id: string }> = [];
    let match;

    while ((match = headingPattern.exec(html)) !== null) {
      const id = match[2].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      headings.push({
        level: parseInt(match[1], 10),
        text: match[2],
        id,
      });
    }

    if (headings.length === 0) {
      return html;
    }

    // Generate TOC HTML
    const tocItems = headings
      .map((h) => `<li class="toc-level-${h.level}"><a href="#${h.id}">${h.text}</a></li>`)
      .join('\n');

    const toc = `
      <nav class="table-of-contents">
        <h2>Table of Contents</h2>
        <ul>${tocItems}</ul>
      </nav>
    `;

    // Add IDs to headings in content
    let modifiedHtml = html;
    for (const heading of headings) {
      const pattern = new RegExp(
        `<h${heading.level}([^>]*)>${heading.text}</h${heading.level}>`,
        'i',
      );
      modifiedHtml = modifiedHtml.replace(
        pattern,
        `<h${heading.level}$1 id="${heading.id}">${heading.text}</h${heading.level}>`,
      );
    }

    // Insert TOC after opening body tag
    return modifiedHtml.replace('<body>', `<body>${toc}`);
  }
}
