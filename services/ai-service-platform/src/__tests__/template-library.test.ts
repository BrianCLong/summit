import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateLibrary } from '../templates/template-library.js';

describe('TemplateLibrary', () => {
  let library: TemplateLibrary;

  beforeEach(async () => {
    library = new TemplateLibrary();
    await library.loadBuiltInTemplates();
  });

  describe('loadBuiltInTemplates', () => {
    it('should load all built-in templates', async () => {
      const templates = await library.list();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include LLM inference template', async () => {
      const template = await library.get('llm-inference');
      expect(template).toBeDefined();
      expect(template?.name).toBe('LLM Inference Service');
      expect(template?.category).toBe('llm');
    });

    it('should include document processor template', async () => {
      const template = await library.get('document-processor');
      expect(template).toBeDefined();
      expect(template?.category).toBe('vision');
    });

    it('should include NLP pipeline template', async () => {
      const template = await library.get('nlp-pipeline');
      expect(template).toBeDefined();
      expect(template?.category).toBe('nlp');
    });
  });

  describe('list', () => {
    it('should filter templates by category', async () => {
      const llmTemplates = await library.list('llm');
      expect(llmTemplates.every(t => t.category === 'llm')).toBe(true);
    });

    it('should return all templates when no filter', async () => {
      const allTemplates = await library.list();
      const categories = new Set(allTemplates.map(t => t.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent template', async () => {
      const template = await library.get('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('createFromTemplate', () => {
    it('should create a customized template', async () => {
      const custom = await library.createFromTemplate('llm-inference', {
        name: 'Custom LLM Service',
        description: 'A customized LLM service',
      });

      expect(custom.name).toBe('Custom LLM Service');
      expect(custom.description).toBe('A customized LLM service');
      expect(custom.category).toBe('llm'); // inherited from base
      expect(custom.id).toContain('custom-');
    });

    it('should throw for non-existent template', async () => {
      await expect(
        library.createFromTemplate('non-existent', {}),
      ).rejects.toThrow('Template non-existent not found');
    });
  });
});
