/**
 * Tests for TemplateEngine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TemplateEngine } from '../../src/core/engine.js';
import type { PromptTemplate } from '../../src/core/types.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('render', () => {
    it('should render template with variables', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: 'Hello {{name}}!',
        variables: [
          {
            name: 'name',
            type: 'string',
          },
        ],
      };

      const context = {
        name: 'World',
      };

      const result = engine.render(template, context);
      expect(result.content).toBe('Hello World!');
    });

    it('should apply default values', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: 'Hello {{name}}!',
        variables: [
          {
            name: 'name',
            type: 'string',
            default: 'Default',
          },
        ],
      };

      const result = engine.render(template, {});
      expect(result.content).toBe('Hello Default!');
    });

    it('should use Handlebars helpers', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: '{{upper text}} and {{lower TEXT}}',
      };

      const result = engine.render(template, {
        text: 'hello',
        TEXT: 'WORLD',
      });

      expect(result.content).toBe('HELLO and world');
    });

    it('should calculate token estimate', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: 'A'.repeat(400), // ~100 tokens
      };

      const result = engine.render(template, {});
      expect(result.metadata.tokenEstimate).toBeGreaterThan(90);
      expect(result.metadata.tokenEstimate).toBeLessThan(110);
    });
  });

  describe('getMissingVariables', () => {
    it('should identify missing required variables', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: 'Test',
        variables: [
          {
            name: 'required1',
            type: 'string',
            required: true,
          },
          {
            name: 'required2',
            type: 'string',
            required: true,
          },
          {
            name: 'optional',
            type: 'string',
            required: false,
          },
        ],
      };

      const missing = engine.getMissingVariables(template, { required1: 'value' });
      expect(missing).toEqual(['required2']);
    });
  });

  describe('extractVariables', () => {
    it('should extract variable names from content', () => {
      const content = 'Hello {{name}}, you have {{count}} messages in {{folder}}';
      const variables = engine.extractVariables(content);

      expect(variables).toEqual(['name', 'count', 'folder']);
    });

    it('should handle nested properties', () => {
      const content = 'User: {{user.name}}, Email: {{user.email}}';
      const variables = engine.extractVariables(content);

      expect(variables).toEqual(['user', 'user']);
    });
  });

  describe('preview', () => {
    it('should generate preview with sample data', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: 'Name: {{name}}, Count: {{count}}',
        variables: [
          {
            name: 'name',
            type: 'string',
            default: 'Sample',
          },
          {
            name: 'count',
            type: 'number',
          },
        ],
      };

      const result = engine.preview(template);
      expect(result.content).toContain('Sample');
      expect(result.content).toContain('0');
    });
  });
});
