import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import { logger } from '../utils/logger';
import type { PromptConfig } from './types';

export class PromptRegistry {
  private prompts: Map<string, PromptConfig> = new Map();
  private schema: any = null;
  private ajv = new Ajv();
  private promptsDir: string;

  constructor(promptsDir: string = './prompts') {
    this.promptsDir = promptsDir;
  }

  async initialize(): Promise<void> {
    try {
      // Load schema
      const schemaPath = path.join(this.promptsDir, 'schema.json');
      try {
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');
        this.schema = JSON.parse(schemaContent);
      } catch (e) {
        logger.warn('Schema file not found or invalid, proceeding without validation');
      }

      // Load all prompt templates recursively
      await this.loadPromptsRecursively(this.promptsDir);

      logger.info(`Loaded ${this.prompts.size} prompt templates`, {
        templates: Array.from(this.prompts.keys()),
      });
    } catch (error: any) {
      logger.error('Failed to initialize prompt registry', {
        error: error.message,
      });
      throw error;
    }
  }

  private async loadPromptsRecursively(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.loadPromptsRecursively(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        await this.loadPrompt(fullPath);
      }
    }
  }

  private async loadPrompt(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const prompt = yaml.load(content) as PromptConfig;

      if (!prompt || !prompt.meta || !prompt.meta.id) {
         // Skip files that don't look like prompt configs
         return;
      }

      // Validate against schema
      if (this.schema) {
        const valid = this.ajv.validate(this.schema, prompt);
        if (!valid) {
          logger.warn(`Invalid prompt schema for ${filePath}: ${this.ajv.errorsText()}`);
          // We can decide to throw or just warn. For now, let's warn but try to load if id exists.
        }
      }

      this.prompts.set(prompt.meta.id, prompt);
      logger.debug('Loaded prompt template', {
        id: prompt.meta.id,
        file: path.basename(filePath),
      });
    } catch (error: any) {
      logger.error('Failed to load prompt', {
        file: filePath,
        error: error.message,
      });
      // Don't throw here to allow other prompts to load
    }
  }

  getPrompt(id: string): PromptConfig | null {
    return this.prompts.get(id) || null;
  }

  getAllPrompts(): PromptConfig[] {
    return Array.from(this.prompts.values());
  }

  render(id: string, inputs: Record<string, any>): string {
    const prompt = this.getPrompt(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    // Validate inputs
    this.validateInputs(prompt, inputs);

    // Simple template rendering (replace {{variable}} with values)
    return this.renderTemplate(prompt.template, inputs);
  }

  private validateInputs(
    prompt: PromptConfig,
    inputs: Record<string, any>,
  ): void {
    const required = Object.keys(prompt.inputs);
    const missing = required.filter((key) => !(key in inputs));
    if (missing.length > 0) {
      throw new Error(`Missing required inputs: ${missing.join(', ')}`);
    }

    // Type validation
    for (const [key, expectedType] of Object.entries(prompt.inputs)) {
      const value = inputs[key];
      if (!this.validateType(value, expectedType)) {
        throw new Error(
          `Invalid type for ${key}: expected ${expectedType}, got ${typeof value}`,
        );
      }
    }
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }

  private renderTemplate(
    template: string,
    inputs: Record<string, any>,
  ): string {
    let rendered = template;

    // Handle simple {{variable}} replacements
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const stringValue = this.formatValue(value);
      rendered = rendered.replace(placeholder, stringValue);
    }

    // Handle array iterations {{#array}}...{{/array}}
    rendered = this.renderArrays(rendered, inputs);

    return rendered;
  }

  private formatValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join('\n');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  private renderArrays(template: string, inputs: Record<string, any>): string {
    // Simple array iteration: {{#arrayName}}{{.}}{{/arrayName}}
    return template.replace(
      /{{#(\w+)}}(.*?){{\/\1}}/gs,
      (match, arrayName, itemTemplate) => {
        const array = inputs[arrayName];
        if (!Array.isArray(array)) {
          return '';
        }

        return array
          .map((item) => {
            if (typeof item === 'object') {
              // Replace {{property}} in item template
              let rendered = itemTemplate;
              for (const [key, value] of Object.entries(item)) {
                rendered = rendered.replace(
                  new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
                  String(value),
                );
              }
              return rendered;
            } else {
              // Replace {{.}} with item value
              return itemTemplate.replace(/{{\.}}/g, String(item));
            }
          })
          .join('');
      },
    );
  }

  async runGoldenTests(promptId?: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const promptsToTest = promptId
      ? [this.getPrompt(promptId)].filter(Boolean)
      : this.getAllPrompts();

    for (const prompt of promptsToTest) {
      if (!prompt!.examples?.length) {
        continue;
      }

      for (const example of prompt!.examples) {
        try {
          const rendered = this.render(prompt!.meta.id, example.inputs);
          let passed = true;
          let missing: string[] = [];

          if (example.expected_contains) {
            passed = example.expected_contains.every((expected) =>
              rendered.includes(expected),
            );
            if (!passed) {
               missing = example.expected_contains.filter(
                  (expected) => !rendered.includes(expected),
                );
            }
          }

          results.push({
            promptId: prompt!.meta.id,
            exampleName: example.name,
            passed,
            rendered,
            expectedContains: example.expected_contains || [],
            missingExpected: missing,
          });
        } catch (error: any) {
          results.push({
            promptId: prompt!.meta.id,
            exampleName: example.name,
            passed: false,
            error: error.message,
            expectedContains: example.expected_contains || [],
            missingExpected: example.expected_contains || [],
          });
        }
      }
    }

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;

    logger.info('Golden tests completed', {
      passed,
      total,
      successRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
    });

    return results;
  }

  async reloadPrompts(): Promise<void> {
    this.prompts.clear();
    await this.initialize();
  }
}

interface TestResult {
  promptId: string;
  exampleName: string;
  passed: boolean;
  rendered?: string;
  error?: string;
  expectedContains: string[];
  missingExpected: string[];
}

export const promptRegistry = new PromptRegistry();
