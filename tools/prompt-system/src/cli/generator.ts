/**
 * Template generator - non-interactive mode
 */

import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import type { TemplateRegistry } from '../core/registry.js';
import type { TemplateContext, GeneratedPrompt } from '../core/types.js';
import { TemplateEngine } from '../core/engine.js';

interface GeneratorOptions {
  var?: string[];
  file?: string;
  output?: string;
  clipboard?: boolean;
  jira?: boolean;
  linear?: boolean;
  github?: boolean;
}

export class TemplateGenerator {
  private registry: TemplateRegistry;
  private engine: TemplateEngine;

  constructor(registry: TemplateRegistry) {
    this.registry = registry;
    this.engine = new TemplateEngine();
  }

  async generate(templateId: string, options: GeneratorOptions = {}): Promise<GeneratedPrompt> {
    const template = this.registry.getOrThrow(templateId);

    // Build context from options
    const context = await this.buildContext(options);

    // Generate prompt
    const generated = this.engine.render(template, context);

    return generated;
  }

  preview(templateId: string): GeneratedPrompt {
    const template = this.registry.getOrThrow(templateId);
    return this.engine.preview(template);
  }

  private async buildContext(options: GeneratorOptions): Promise<TemplateContext> {
    let context: TemplateContext = {};

    // Load from file if specified
    if (options.file) {
      const fileContent = readFileSync(options.file, 'utf-8');
      const ext = options.file.split('.').pop();

      if (ext === 'json') {
        context = JSON.parse(fileContent);
      } else if (ext === 'yaml' || ext === 'yml') {
        context = yaml.load(fileContent) as TemplateContext;
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }
    }

    // Override with command-line variables
    if (options.var && options.var.length > 0) {
      for (const varStr of options.var) {
        const [key, ...valueParts] = varStr.split('=');
        const value = valueParts.join('='); // Handle values with '='

        // Try to parse as JSON for objects/arrays
        try {
          context[key] = JSON.parse(value);
        } catch {
          // Not JSON, use as string
          context[key] = value;
        }
      }
    }

    return context;
  }
}
