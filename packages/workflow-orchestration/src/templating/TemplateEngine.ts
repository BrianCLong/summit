/**
 * Template Engine for parameter substitution
 * Simple Jinja-like templating without external dependencies
 */

import { ExecutionContext } from '../types/dag-types.js';

export class TemplateEngine {
  /**
   * Render template with context
   */
  render(template: string, context: Record<string, any>): string {
    let result = template;

    // Handle {{ variable }} syntax
    result = result.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      const trimmed = expression.trim();
      const value = this.evaluateExpression(trimmed, context);
      return value !== undefined && value !== null ? String(value) : '';
    });

    // Handle {% if condition %} ... {% endif %}
    result = this.processConditionals(result, context);

    // Handle {% for item in items %} ... {% endfor %}
    result = this.processLoops(result, context);

    return result;
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
      execution_date: executionContext.executionDate.toISOString(),
      execution_id: executionContext.executionId,
      dag_id: executionContext.dagId,
      task_id: executionContext.taskId,
      attempt: executionContext.attempt,
      params: executionContext.params,
      var: executionContext.variables,
      now: new Date().toISOString(),
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
   * Evaluate expression in context
   */
  private evaluateExpression(expression: string, context: Record<string, any>): any {
    // Handle filters (e.g., value | upper)
    const parts = expression.split('|').map(p => p.trim());
    let value = this.resolveValue(parts[0], context);

    for (let i = 1; i < parts.length; i++) {
      const filterExpr = parts[i];
      const filterMatch = filterExpr.match(/^(\w+)(?:\(([^)]*)\))?$/);

      if (filterMatch) {
        const filterName = filterMatch[1];
        const filterArg = filterMatch[2];
        value = this.applyFilter(value, filterName, filterArg);
      }
    }

    return value;
  }

  /**
   * Resolve a value from context
   */
  private resolveValue(path: string, context: Record<string, any>): any {
    const parts = path.split('.');
    let current: any = context;

    for (const part of parts) {
      // Handle array access like items[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current?.[arrayMatch[1]]?.[parseInt(arrayMatch[2], 10)];
      } else {
        current = current?.[part];
      }

      if (current === undefined) break;
    }

    return current;
  }

  /**
   * Apply filter to value
   */
  private applyFilter(value: any, filterName: string, arg?: string): any {
    switch (filterName) {
      case 'upper':
        return String(value).toUpperCase();
      case 'lower':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'json':
        return JSON.stringify(value, null, arg ? parseInt(arg, 10) : undefined);
      case 'default':
        return value !== undefined && value !== null && value !== ''
          ? value
          : (arg?.replace(/^['"]|['"]$/g, '') || '');
      case 'length':
        return Array.isArray(value) ? value.length : String(value).length;
      case 'first':
        return Array.isArray(value) ? value[0] : String(value)[0];
      case 'last':
        return Array.isArray(value) ? value[value.length - 1] : String(value).slice(-1);
      default:
        return value;
    }
  }

  /**
   * Process conditionals
   */
  private processConditionals(template: string, context: Record<string, any>): string {
    const ifRegex = /\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;

    return template.replace(ifRegex, (match, condition, content) => {
      const conditionValue = this.evaluateCondition(condition.trim(), context);
      const elseMatch = content.match(/(.*)(?:\{%\s*else\s*%\})(.*)/s);

      if (elseMatch) {
        return conditionValue ? elseMatch[1] : elseMatch[2];
      }

      return conditionValue ? content : '';
    });
  }

  /**
   * Process loops
   */
  private processLoops(template: string, context: Record<string, any>): string {
    const forRegex = /\{%\s*for\s+(\w+)\s+in\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;

    return template.replace(forRegex, (match, itemVar, iterableExpr, content) => {
      const iterable = this.resolveValue(iterableExpr.trim(), context);

      if (!Array.isArray(iterable)) return '';

      return iterable.map((item, index) => {
        const loopContext = {
          ...context,
          [itemVar]: item,
          loop: {
            index: index + 1,
            index0: index,
            first: index === 0,
            last: index === iterable.length - 1,
            length: iterable.length,
          },
        };
        return this.render(content, loopContext);
      }).join('');
    });
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    if (condition.startsWith('not ')) {
      return !this.evaluateCondition(condition.slice(4), context);
    }

    const compMatch = condition.match(/^([^=!<>]+)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (compMatch) {
      const left = this.resolveValue(compMatch[1].trim(), context);
      const op = compMatch[2];
      let right: any = compMatch[3].trim();

      if (right === 'true') right = true;
      else if (right === 'false') right = false;
      else if (right === 'null' || right === 'none') right = null;
      else if (/^\d+$/.test(right)) right = parseInt(right, 10);
      else if (/^\d+\.\d+$/.test(right)) right = parseFloat(right);
      else if (right.startsWith("'") || right.startsWith('"')) {
        right = right.slice(1, -1);
      } else {
        right = this.resolveValue(right, context);
      }

      switch (op) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
      }
    }

    if (condition.includes(' and ')) {
      return condition.split(' and ').every(c => this.evaluateCondition(c.trim(), context));
    }
    if (condition.includes(' or ')) {
      return condition.split(' or ').some(c => this.evaluateCondition(c.trim(), context));
    }

    const value = this.resolveValue(condition, context);
    return Boolean(value);
  }

  /**
   * Format date
   */
  private formatDate(date: Date, format?: string): string {
    if (!format || format === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0];
    }

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
