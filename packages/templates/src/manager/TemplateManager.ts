/**
 * Template management system
 */

import { v4 as uuidv4 } from 'uuid';
import Handlebars from 'handlebars';
import Mustache from 'mustache';

export interface Template {
  id: string;
  name: string;
  description?: string;
  format: 'DOCX' | 'PDF' | 'HTML' | 'PPTX' | 'MARKDOWN';
  content: string;
  variables: TemplateVariable[];
  sections: TemplateSection[];
  styling?: TemplateStyling;
  version: string;
  parentTemplateId?: string; // For template inheritance
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
}

export interface TemplateVariable {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface TemplateSection {
  id: string;
  name: string;
  title: string;
  content: string;
  type: 'TEXT' | 'CHART' | 'TABLE' | 'MAP' | 'TIMELINE' | 'NETWORK' | 'IMAGE' | 'CUSTOM';
  order: number;
  conditional?: string; // Conditional logic for including section
  repeatFor?: string; // Variable to iterate over for repeated sections
  metadata?: Record<string, any>;
}

export interface TemplateStyling {
  theme: string;
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
  fonts: {
    heading?: string;
    body?: string;
    code?: string;
  };
  logo?: string;
  headerFooter: boolean;
  pageNumbers: boolean;
  toc: boolean; // Table of contents
  coverPage: boolean;
  customCSS?: string;
}

export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private engine: 'handlebars' | 'mustache' = 'handlebars';

  constructor(engine: 'handlebars' | 'mustache' = 'handlebars') {
    this.engine = engine;
    this.registerDefaultHelpers();
  }

  /**
   * Register default template helpers
   */
  private registerDefaultHelpers(): void {
    if (this.engine === 'handlebars') {
      // Date formatting
      Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
        return date.toISOString().split('T')[0];
      });

      // Conditional helpers
      Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
      Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
      Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
      Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

      // Array helpers
      Handlebars.registerHelper('join', (arr: any[], sep: string) =>
        Array.isArray(arr) ? arr.join(sep) : ''
      );

      // String helpers
      Handlebars.registerHelper('uppercase', (str: string) =>
        str ? str.toUpperCase() : ''
      );
      Handlebars.registerHelper('lowercase', (str: string) =>
        str ? str.toLowerCase() : ''
      );
    }
  }

  /**
   * Create a new template
   */
  createTemplate(
    template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Template {
    const newTemplate: Template = {
      ...template,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): Template | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Update template
   */
  updateTemplate(
    templateId: string,
    updates: Partial<Template>
  ): Template {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updated = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * List templates
   */
  listTemplates(filters?: {
    category?: string;
    format?: string;
    tags?: string[];
    isPublic?: boolean;
    createdBy?: string;
  }): Template[] {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      if (filters.format) {
        templates = templates.filter(t => t.format === filters.format);
      }
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(t =>
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }
      if (filters.isPublic !== undefined) {
        templates = templates.filter(t => t.isPublic === filters.isPublic);
      }
      if (filters.createdBy) {
        templates = templates.filter(t => t.createdBy === filters.createdBy);
      }
    }

    return templates;
  }

  /**
   * Clone template
   */
  cloneTemplate(templateId: string, newName: string, userId: string): Template {
    const original = this.templates.get(templateId);
    if (!original) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const cloned: Template = {
      ...original,
      id: uuidv4(),
      name: newName,
      parentTemplateId: templateId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      usageCount: 0,
      version: '1.0.0'
    };

    this.templates.set(cloned.id, cloned);
    return cloned;
  }

  /**
   * Render template with data
   */
  renderTemplate(templateId: string, data: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required variables
    const missingVars = template.variables
      .filter(v => v.required && !(v.name in data))
      .map(v => v.name);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Apply default values
    const templateData = { ...data };
    for (const variable of template.variables) {
      if (!(variable.name in templateData) && variable.defaultValue !== undefined) {
        templateData[variable.name] = variable.defaultValue;
      }
    }

    // Increment usage count
    template.usageCount++;

    // Render based on engine
    if (this.engine === 'handlebars') {
      const compiled = Handlebars.compile(template.content);
      return compiled(templateData);
    } else {
      return Mustache.render(template.content, templateData);
    }
  }

  /**
   * Validate template syntax
   */
  validateTemplate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (this.engine === 'handlebars') {
        Handlebars.compile(content);
      } else {
        Mustache.parse(content);
      }
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { valid: false, errors };
    }
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): string[] {
    const variables = new Set<string>();

    if (this.engine === 'handlebars') {
      // Match {{variable}} and {{#if variable}}
      const regex = /\{\{[#/]?(\w+)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        variables.add(match[1]);
      }
    } else {
      // Match {{variable}} for Mustache
      const regex = /\{\{(\w+)\}\}/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables);
  }

  /**
   * Create template from another template (inheritance)
   */
  extendTemplate(
    parentId: string,
    overrides: Partial<Template>,
    userId: string
  ): Template {
    const parent = this.templates.get(parentId);
    if (!parent) {
      throw new Error(`Parent template not found: ${parentId}`);
    }

    const extended: Template = {
      ...parent,
      ...overrides,
      id: uuidv4(),
      parentTemplateId: parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      usageCount: 0,
      version: '1.0.0'
    };

    this.templates.set(extended.id, extended);
    return extended;
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): Template[] {
    return Array.from(this.templates.values())
      .filter(t => t.isPublic)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): Template[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
