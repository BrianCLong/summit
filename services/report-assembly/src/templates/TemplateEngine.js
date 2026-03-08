"use strict";
/**
 * TemplateEngine - Handlebars-based template rendering engine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngine = void 0;
const handlebars_1 = __importDefault(require("handlebars"));
const defaultTemplates_js_1 = require("./defaultTemplates.js");
class TemplateEngine {
    templates = new Map();
    compiledTemplates = new Map();
    constructor() {
        this.registerHelpers();
        this.loadDefaultTemplates();
    }
    /**
     * Register a new template
     */
    registerTemplate(template) {
        this.templates.set(template.id, template);
        // Pre-compile all section templates
        for (const section of template.sections) {
            const key = `${template.id}:${section.id}`;
            this.compiledTemplates.set(key, handlebars_1.default.compile(section.template));
        }
    }
    /**
     * Get a template by ID
     */
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }
    /**
     * Get template for a briefing type
     */
    getTemplateForBriefingType(briefingType) {
        for (const template of this.templates.values()) {
            if (template.briefingTypes.includes(briefingType)) {
                return template;
            }
        }
        return undefined;
    }
    /**
     * Render a full briefing document
     */
    render(templateId, context) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        const sections = template.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => this.renderSection(templateId, section, context))
            .join('\n');
        return this.wrapInDocument(template, sections, context);
    }
    /**
     * Render a single section
     */
    renderSection(templateId, section, context) {
        const key = `${templateId}:${section.id}`;
        let compiled = this.compiledTemplates.get(key);
        if (!compiled) {
            compiled = handlebars_1.default.compile(section.template);
            this.compiledTemplates.set(key, compiled);
        }
        // Extract section-specific data if dataPath is specified
        const sectionData = section.dataPath
            ? this.getNestedValue(context.data, section.dataPath)
            : context.data;
        return compiled({
            ...context,
            ...context.data,
            sectionData,
        });
    }
    /**
     * Wrap sections in a full HTML document
     */
    wrapInDocument(template, content, context) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${context.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1, h2, h3, h4 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    p { margin: 0.5rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
    a { color: #0066cc; }
    ${template.styles}
  </style>
</head>
<body>
  ${content}
  <footer class="document-footer">
    <hr>
    <p><small>Generated: ${context.generatedAt} | Classification: ${context.classificationLevel}</small></p>
  </footer>
</body>
</html>`;
    }
    /**
     * Register Handlebars helpers
     */
    registerHelpers() {
        handlebars_1.default.registerHelper('formatDate', (dateStr) => {
            if (!dateStr)
                return '';
            try {
                return new Date(dateStr).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            }
            catch {
                return dateStr;
            }
        });
        handlebars_1.default.registerHelper('formatDateTime', (dateStr) => {
            if (!dateStr)
                return '';
            try {
                return new Date(dateStr).toLocaleString('en-US');
            }
            catch {
                return dateStr;
            }
        });
        handlebars_1.default.registerHelper('formatPercent', (num) => {
            if (typeof num !== 'number')
                return '0%';
            return `${(num * 100).toFixed(1)}%`;
        });
        handlebars_1.default.registerHelper('truncate', (str, len) => {
            if (!str)
                return '';
            if (str.length <= len)
                return str;
            return str.substring(0, len) + '...';
        });
        handlebars_1.default.registerHelper('eq', (a, b) => a === b);
        handlebars_1.default.registerHelper('ne', (a, b) => a !== b);
        handlebars_1.default.registerHelper('lt', (a, b) => a < b);
        handlebars_1.default.registerHelper('lte', (a, b) => a <= b);
        handlebars_1.default.registerHelper('gt', (a, b) => a > b);
        handlebars_1.default.registerHelper('gte', (a, b) => a >= b);
        handlebars_1.default.registerHelper('and', (...args) => {
            args.pop(); // Remove options object
            return args.every(Boolean);
        });
        handlebars_1.default.registerHelper('or', (...args) => {
            args.pop(); // Remove options object
            return args.some(Boolean);
        });
        handlebars_1.default.registerHelper('json', (obj) => {
            return JSON.stringify(obj, null, 2);
        });
        handlebars_1.default.registerHelper('uppercase', (str) => {
            return str?.toUpperCase() || '';
        });
        handlebars_1.default.registerHelper('lowercase', (str) => {
            return str?.toLowerCase() || '';
        });
        handlebars_1.default.registerHelper('count', (arr) => {
            return Array.isArray(arr) ? arr.length : 0;
        });
        handlebars_1.default.registerHelper('join', (arr, separator) => {
            if (!Array.isArray(arr))
                return '';
            return arr.join(separator || ', ');
        });
        handlebars_1.default.registerHelper('priorityClass', (priority) => {
            const classes = {
                critical: 'priority-critical',
                high: 'priority-high',
                medium: 'priority-medium',
                low: 'priority-low',
            };
            return classes[priority] || '';
        });
    }
    /**
     * Load default templates
     */
    loadDefaultTemplates() {
        for (const template of defaultTemplates_js_1.defaultTemplates) {
            this.registerTemplate(template);
        }
    }
    /**
     * Get nested value from object using dot notation path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && typeof current === 'object' ? current[key] : undefined;
        }, obj);
    }
    /**
     * List all available templates
     */
    listTemplates() {
        return Array.from(this.templates.values()).map((t) => ({
            id: t.id,
            name: t.name,
            briefingTypes: t.briefingTypes,
        }));
    }
}
exports.TemplateEngine = TemplateEngine;
