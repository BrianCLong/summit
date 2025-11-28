/**
 * Template Registry - Manages loading, caching, and retrieval of templates
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import type { PromptTemplate, TemplateCategory, TemplateType } from './types.js';
import { TemplateValidator } from './validator.js';
import { TemplateComposer } from './composer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TemplateRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
  private templatesDir: string;
  private validator: TemplateValidator;
  private composer: TemplateComposer;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || join(__dirname, '../../templates');
    this.validator = new TemplateValidator();
    this.composer = new TemplateComposer(this);
  }

  /**
   * Load all templates from the templates directory
   */
  async loadAll(): Promise<void> {
    const categories = ['core', 'specialized', 'meta', 'custom'];

    for (const category of categories) {
      const categoryDir = join(this.templatesDir, category);
      if (!existsSync(categoryDir)) continue;

      const files = readdirSync(categoryDir);
      for (const file of files) {
        const filePath = join(categoryDir, file);
        const stats = statSync(filePath);

        if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml'))) {
          try {
            const template = this.loadTemplateFile(filePath);
            this.register(template);
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }
    }
  }

  /**
   * Load a single template file
   */
  private loadTemplateFile(filePath: string): PromptTemplate {
    const content = readFileSync(filePath, 'utf-8');
    const ext = extname(filePath);

    if (ext === '.md') {
      return this.parseMarkdownTemplate(content, filePath);
    } else if (ext === '.yaml' || ext === '.yml') {
      return this.parseYamlTemplate(content);
    } else {
      throw new Error(`Unsupported template file format: ${ext}`);
    }
  }

  /**
   * Parse markdown template with YAML frontmatter
   */
  private parseMarkdownTemplate(content: string, filePath: string): PromptTemplate {
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error('Markdown template must have YAML frontmatter');
    }

    const frontmatter = yaml.load(frontmatterMatch[1]) as Partial<PromptTemplate>;
    const templateContent = frontmatterMatch[2].trim();

    const template: PromptTemplate = {
      ...frontmatter,
      content: templateContent,
    } as PromptTemplate;

    return template;
  }

  /**
   * Parse YAML template file
   */
  private parseYamlTemplate(content: string): PromptTemplate {
    const template = yaml.load(content) as PromptTemplate;
    return template;
  }

  /**
   * Register a template
   */
  register(template: PromptTemplate): void {
    // Validate template
    const validation = this.validator.validate(template);
    if (!validation.valid) {
      throw new Error(
        `Template validation failed for ${template.id}:\n${validation.errors?.map(e => `  ${e.path}: ${e.message}`).join('\n')}`
      );
    }

    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get template by ID or throw error
   */
  getOrThrow(id: string): PromptTemplate {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    return template;
  }

  /**
   * Get all templates
   */
  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): PromptTemplate[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * Get templates by type
   */
  getByType(type: TemplateType): PromptTemplate[] {
    return this.getAll().filter(t => t.type === type);
  }

  /**
   * Search templates by tags
   */
  searchByTags(tags: string[]): PromptTemplate[] {
    return this.getAll().filter(template => {
      if (!template.tags) return false;
      return tags.some(tag => template.tags!.includes(tag));
    });
  }

  /**
   * Search templates by name or description
   */
  search(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(template => {
      const nameMatch = template.name.toLowerCase().includes(lowerQuery);
      const descMatch = template.description?.toLowerCase().includes(lowerQuery);
      const tagMatch = template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      return nameMatch || descMatch || tagMatch;
    });
  }

  /**
   * Get template with composition (extends + mixins)
   */
  async getComposed(id: string): Promise<PromptTemplate> {
    const template = this.getOrThrow(id);
    return this.composer.compose(template);
  }

  /**
   * Get template statistics
   */
  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      byCategory: {
        core: this.getByCategory('core').length,
        specialized: this.getByCategory('specialized').length,
        meta: this.getByCategory('meta').length,
        custom: this.getByCategory('custom').length,
      },
      byType: all.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avgVariables: all.reduce((sum, t) => sum + (t.variables?.length || 0), 0) / all.length,
      totalTags: new Set(all.flatMap(t => t.tags || [])).size,
    };
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates.clear();
  }
}
