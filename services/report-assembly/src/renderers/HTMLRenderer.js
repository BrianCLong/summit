"use strict";
/**
 * HTMLRenderer - Renders briefing packages to HTML format
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLRenderer = void 0;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const marked_1 = require("marked");
const TemplateEngine_js_1 = require("../templates/TemplateEngine.js");
const defaultOptions = {
    sanitize: true,
    parseMarkdown: true,
    includeStyles: true,
    inlineStyles: false,
};
class HTMLRenderer {
    templateEngine;
    constructor(templateEngine) {
        this.templateEngine = templateEngine || new TemplateEngine_js_1.TemplateEngine();
    }
    /**
     * Render briefing context to HTML
     */
    async render(context, templateId, options = {}) {
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
    renderCustom(html, context, options = {}) {
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
    async processMarkdown(html) {
        // Find markdown blocks and convert them
        const markdownPattern = /<markdown>([\s\S]*?)<\/markdown>/gi;
        let result = html;
        let match;
        while ((match = markdownPattern.exec(html)) !== null) {
            const markdownContent = match[1];
            if (!markdownContent)
                continue;
            const htmlContent = await marked_1.marked.parse(markdownContent);
            result = result.replace(match[0], htmlContent);
        }
        return result;
    }
    /**
     * Sanitize HTML to prevent XSS
     */
    sanitize(html) {
        return (0, sanitize_html_1.default)(html, {
            allowedTags: sanitize_html_1.default.defaults.allowedTags.concat([
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'img', 'figure', 'figcaption',
                'section', 'article', 'header', 'footer', 'nav',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'dl', 'dt', 'dd',
                'style', 'span', 'div',
            ]),
            allowedAttributes: {
                ...sanitize_html_1.default.defaults.allowedAttributes,
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
    generateFilename(context, extension) {
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
    addWatermark(html, watermarkText) {
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
    addTableOfContents(html) {
        // Extract headings
        const headingPattern = /<h([2-4])[^>]*>([^<]+)<\/h\1>/gi;
        const headings = [];
        let match;
        while ((match = headingPattern.exec(html)) !== null) {
            const levelStr = match[1];
            const text = match[2];
            if (!levelStr || !text)
                continue;
            const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            headings.push({
                level: parseInt(levelStr, 10),
                text: text,
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
            const pattern = new RegExp(`<h${heading.level}([^>]*)>${heading.text}</h${heading.level}>`, 'i');
            modifiedHtml = modifiedHtml.replace(pattern, `<h${heading.level}$1 id="${heading.id}">${heading.text}</h${heading.level}>`);
        }
        // Insert TOC after opening body tag
        return modifiedHtml.replace('<body>', `<body>${toc}`);
    }
}
exports.HTMLRenderer = HTMLRenderer;
