/**
 * Template Engine for parameter substitution and Jinja templating
 */

import nunjucks from 'nunjucks';
import { ExecutionContext } from '@summit/dag-engine';

export class TemplateEngine {
  private env: nunjucks.Environment;

  constructor() {
    this.env = nunjucks.configure({ autoescape: false });

    // Add custom filters
    this.addCustomFilters();
  }

  /**
   * Render template with context
   */
  render(template: string, context: Record<string, any>): string {
    try {
      return this.env.renderString(template, context);
    } catch (error) {
      throw new Error(`Template rendering failed: ${(error as Error).message}`);
    }
  }

  /**
   * Render object recursively
   */
  renderObject(obj: any, context: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.render(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.renderObject(item, context));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.renderObject(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Create context from execution context
   */
  createContext(executionContext: ExecutionContext): Record<string, any> {
    return {
      ds: this.formatDate(executionContext.executionDate),
      execution_date: executionContext.executionDate,
      execution_id: executionContext.executionId,
      dag_id: executionContext.dagId,
      task_id: executionContext.taskId,
      attempt: executionContext.attempt,
      params: executionContext.params,
      var: executionContext.variables,
      now: new Date(),
      // Macros
      macros: {
        ds_add: (days: number) =>
          this.formatDate(this.addDays(executionContext.executionDate, days)),
        ds_format: (format: string) =>
          this.formatDate(executionContext.executionDate, format),
      },
    };
  }

  /**
   * Add custom Jinja filters
   */
  private addCustomFilters(): void {
    // Date formatting filter
    this.env.addFilter('date', (date: Date, format?: string) => {
      return this.formatDate(date, format);
    });

    // JSON filter
    this.env.addFilter('json', (obj: any, indent?: number) => {
      return JSON.stringify(obj, null, indent);
    });

    // Upper case filter
    this.env.addFilter('upper', (str: string) => {
      return str.toUpperCase();
    });

    // Lower case filter
    this.env.addFilter('lower', (str: string) => {
      return str.toLowerCase();
    });

    // Default value filter
    this.env.addFilter('default', (value: any, defaultValue: any) => {
      return value !== undefined && value !== null ? value : defaultValue;
    });
  }

  /**
   * Format date
   */
  private formatDate(date: Date, format?: string): string {
    if (!format || format === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0];
    }

    // Simple format implementation
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Add days to date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
