/**
 * Template validation using AJV
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { PromptTemplate, TemplateValidationResult } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TemplateValidator {
  private ajv: Ajv;
  private validateTemplate: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.loadSchema();
  }

  private loadSchema(): void {
    try {
      const schemaPath = join(__dirname, '../../schemas/template.schema.json');
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      this.validateTemplate = this.ajv.compile(schema);
    } catch (error) {
      throw new Error(`Failed to load template schema: ${error}`);
    }
  }

  /**
   * Validate a template against the schema
   */
  validate(template: PromptTemplate): TemplateValidationResult {
    const valid = this.validateTemplate(template);

    if (valid) {
      return { valid: true };
    }

    const errors = this.validateTemplate.errors?.map((err: any) => ({
      path: err.instancePath || err.dataPath || 'root',
      message: err.message || 'Unknown error',
    })) || [];

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Validate variable values against template variable definitions
   */
  validateContext(
    template: PromptTemplate,
    context: Record<string, unknown>
  ): TemplateValidationResult {
    const errors: Array<{ path: string; message: string }> = [];

    if (!template.variables) {
      return { valid: true };
    }

    // Check required variables
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in context)) {
        errors.push({
          path: variable.name,
          message: `Required variable '${variable.name}' is missing`,
        });
        continue;
      }

      const value = context[variable.name];
      if (value === undefined) continue;

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      const expectedTypes: string[] = [];

      if (variable.type === 'multiline' || variable.type === 'code') {
        expectedTypes.push('string');
      } else {
        expectedTypes.push(variable.type);
      }

      if (!expectedTypes.includes(actualType)) {
        errors.push({
          path: variable.name,
          message: `Variable '${variable.name}' should be ${variable.type}, got ${actualType}`,
        });
        continue;
      }

      // Validation rules
      if (variable.validation) {
        const validation = variable.validation;

        if (validation.pattern && typeof value === 'string') {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors.push({
              path: variable.name,
              message: `Variable '${variable.name}' does not match pattern ${validation.pattern}`,
            });
          }
        }

        if (validation.min !== undefined && typeof value === 'number') {
          if (value < validation.min) {
            errors.push({
              path: variable.name,
              message: `Variable '${variable.name}' must be >= ${validation.min}`,
            });
          }
        }

        if (validation.max !== undefined && typeof value === 'number') {
          if (value > validation.max) {
            errors.push({
              path: variable.name,
              message: `Variable '${variable.name}' must be <= ${validation.max}`,
            });
          }
        }

        if (validation.enum && !validation.enum.includes(value)) {
          errors.push({
            path: variable.name,
            message: `Variable '${variable.name}' must be one of: ${validation.enum.join(', ')}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate template content for common issues
   */
  validateContent(template: PromptTemplate): TemplateValidationResult {
    const errors: Array<{ path: string; message: string }> = [];

    // Check for undefined variables in content
    const variableNames = new Set(template.variables?.map(v => v.name) || []);
    const contentVariables = template.content.match(/\{\{([^}]+)\}\}/g) || [];

    for (const match of contentVariables) {
      const varName = match.replace(/\{\{|\}\}/g, '').trim().split(/[\s.[\]]/).filter(Boolean)[0];
      if (varName && !variableNames.has(varName)) {
        errors.push({
          path: 'content',
          message: `Template uses undefined variable: {{${varName}}}`,
        });
      }
    }

    // Check for minimum content length
    if (template.validationRules?.minLength) {
      if (template.content.length < template.validationRules.minLength) {
        errors.push({
          path: 'content',
          message: `Content must be at least ${template.validationRules.minLength} characters`,
        });
      }
    }

    // Check for maximum content length
    if (template.validationRules?.maxLength) {
      if (template.content.length > template.validationRules.maxLength) {
        errors.push({
          path: 'content',
          message: `Content must not exceed ${template.validationRules.maxLength} characters`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Run all validation checks
   */
  validateAll(
    template: PromptTemplate,
    context?: Record<string, unknown>
  ): TemplateValidationResult {
    const schemaResult = this.validate(template);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    const contentResult = this.validateContent(template);
    if (!contentResult.valid) {
      return contentResult;
    }

    if (context) {
      const contextResult = this.validateContext(template, context);
      if (!contextResult.valid) {
        return contextResult;
      }
    }

    return { valid: true };
  }
}
