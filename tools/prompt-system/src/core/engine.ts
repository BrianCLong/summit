/**
 * Template rendering engine using Handlebars
 */

import Handlebars from 'handlebars';
import type { PromptTemplate, TemplateContext, GeneratedPrompt } from './types.js';
import { TemplateValidator } from './validator.js';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private validator: TemplateValidator;

  constructor() {
    this.handlebars = Handlebars.create();
    this.validator = new TemplateValidator();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Uppercase helper
    this.handlebars.registerHelper('upper', (str: string) => {
      return str?.toUpperCase() || '';
    });

    // Lowercase helper
    this.handlebars.registerHelper('lower', (str: string) => {
      return str?.toLowerCase() || '';
    });

    // Capitalize helper
    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    });

    // Date formatting helper
    this.handlebars.registerHelper('date', (format: string) => {
      return new Date().toISOString().split('T')[0];
    });

    // Conditional equality
    this.handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    // Conditional inequality
    this.handlebars.registerHelper('ne', (a: any, b: any) => {
      return a !== b;
    });

    // Array join
    this.handlebars.registerHelper('join', (arr: any[], separator: string = ', ') => {
      return Array.isArray(arr) ? arr.join(separator) : '';
    });

    // Default value
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    });

    // Markdown code block
    this.handlebars.registerHelper('codeblock', (lang: string, code: string) => {
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    });

    // Indent helper
    this.handlebars.registerHelper('indent', (text: string, spaces: number = 2) => {
      const indent = ' '.repeat(spaces);
      return text.split('\n').map(line => indent + line).join('\n');
    });

    // Line count
    this.handlebars.registerHelper('linecount', (text: string) => {
      return text ? text.split('\n').length : 0;
    });

    // Truncate
    this.handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
  }

  /**
   * Render a template with the given context
   */
  render(template: PromptTemplate, context: TemplateContext): GeneratedPrompt {
    // Apply defaults from template variables
    const enrichedContext = this.applyDefaults(template, context);

    // Validate context
    const validation = this.validator.validateContext(template, enrichedContext);
    if (!validation.valid) {
      throw new Error(
        `Template context validation failed:\n${validation.errors?.map(e => `  ${e.path}: ${e.message}`).join('\n')}`
      );
    }

    // Compile and render template
    const compiledTemplate = this.handlebars.compile(template.content, {
      noEscape: true,
      strict: false,
    });

    const renderedContent = compiledTemplate(enrichedContext);

    // Calculate token estimate (rough approximation: 1 token ≈ 4 characters)
    const tokenEstimate = Math.ceil(renderedContent.length / 4);

    // Get variables actually used
    const variablesUsed = Object.keys(enrichedContext);

    return {
      template,
      content: renderedContent,
      context: enrichedContext,
      timestamp: new Date().toISOString(),
      metadata: {
        tokenEstimate,
        variablesUsed,
      },
    };
  }

  /**
   * Apply default values from template variables to context
   */
  private applyDefaults(template: PromptTemplate, context: TemplateContext): TemplateContext {
    const result = { ...context };

    if (template.variables) {
      for (const variable of template.variables) {
        if (!(variable.name in result) && variable.default !== undefined) {
          result[variable.name] = variable.default;
        }
      }
    }

    return result;
  }

  /**
   * Get missing required variables
   */
  getMissingVariables(template: PromptTemplate, context: TemplateContext): string[] {
    const missing: string[] = [];

    if (template.variables) {
      for (const variable of template.variables) {
        if (variable.required && !(variable.name in context)) {
          missing.push(variable.name);
        }
      }
    }

    return missing;
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    const variables = new Set<string>();

    for (const match of matches) {
      const varName = match.replace(/\{\{|\}\}/g, '').trim().split(/[\s.[\]]/).filter(Boolean)[0];
      if (varName) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * Preview template with sample data
   */
  preview(template: PromptTemplate): GeneratedPrompt {
    const sampleContext: TemplateContext = {};

    if (template.variables) {
      for (const variable of template.variables) {
        if (variable.default !== undefined) {
          sampleContext[variable.name] = variable.default;
        } else {
          // Generate sample data based on type
          switch (variable.type) {
            case 'string':
            case 'multiline':
            case 'code':
              sampleContext[variable.name] = `[${variable.name}]`;
              break;
            case 'number':
              sampleContext[variable.name] = 0;
              break;
            case 'boolean':
              sampleContext[variable.name] = false;
              break;
            case 'array':
              sampleContext[variable.name] = [];
              break;
            case 'object':
              sampleContext[variable.name] = {};
              break;
          }
        }
      }
    }

    return this.render(template, sampleContext);
  }
}
