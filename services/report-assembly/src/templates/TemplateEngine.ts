/**
 * TemplateEngine - Handlebars-based template rendering engine
 */

import Handlebars from 'handlebars';
import type { TemplateDefinition, RenderContext, RenderResult, TemplateSectionDef } from '../types.js';
import { defaultTemplates } from './defaultTemplates.js';

export class TemplateEngine {
  private readonly templates: Map<string, TemplateDefinition> = new Map();
  private readonly compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
    this.loadDefaultTemplates();
  }

  /**
   * Register a new template
   */
  registerTemplate(template: TemplateDefinition): void {
    this.templates.set(template.id, template);

    // Pre-compile all section templates
    for (const section of template.sections) {
      const key = `${template.id}:${section.id}`;
      this.compiledTemplates.set(key, Handlebars.compile(section.template));
    }
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): TemplateDefinition | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get template for a briefing type
   */
  getTemplateForBriefingType(briefingType: string): TemplateDefinition | undefined {
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
  render(templateId: string, context: RenderContext): string {
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
  renderSection(
    templateId: string,
    section: TemplateSectionDef,
    context: RenderContext,
  ): string {
    const key = `${templateId}:${section.id}`;
    let compiled = this.compiledTemplates.get(key);

    if (!compiled) {
      compiled = Handlebars.compile(section.template);
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
  private wrapInDocument(
    template: TemplateDefinition,
    content: string,
    context: RenderContext,
  ): string {
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
  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    });

    Handlebars.registerHelper('formatDateTime', (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleString('en-US');
      } catch {
        return dateStr;
      }
    });

    Handlebars.registerHelper('formatPercent', (num: number) => {
      if (typeof num !== 'number') return '0%';
      return `${(num * 100).toFixed(1)}%`;
    });

    Handlebars.registerHelper('truncate', (str: string, len: number) => {
      if (!str) return '';
      if (str.length <= len) return str;
      return str.substring(0, len) + '...';
    });

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    Handlebars.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);

    Handlebars.registerHelper('and', (...args) => {
      args.pop(); // Remove options object
      return args.every(Boolean);
    });

    Handlebars.registerHelper('or', (...args) => {
      args.pop(); // Remove options object
      return args.some(Boolean);
    });

    Handlebars.registerHelper('json', (obj: unknown) => {
      return JSON.stringify(obj, null, 2);
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase() || '';
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase() || '';
    });

    Handlebars.registerHelper('count', (arr: unknown[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    });

    Handlebars.registerHelper('join', (arr: unknown[], separator: string) => {
      if (!Array.isArray(arr)) return '';
      return arr.join(separator || ', ');
    });

    Handlebars.registerHelper('priorityClass', (priority: string) => {
      const classes: Record<string, string> = {
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
  private loadDefaultTemplates(): void {
    for (const template of defaultTemplates) {
      this.registerTemplate(template);
    }
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }

  /**
   * List all available templates
   */
  listTemplates(): Array<{ id: string; name: string; briefingTypes: string[] }> {
    return Array.from(this.templates.values()).map((t) => ({
      id: t.id,
      name: t.name,
      briefingTypes: t.briefingTypes,
    }));
  }
}
