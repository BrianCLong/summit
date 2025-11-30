/**
 * Interactive template selector
 */

import { prompt } from 'enquirer';
import chalk from 'chalk';
import type { TemplateRegistry } from '../core/registry.js';
import type { PromptTemplate, TemplateContext, GeneratedPrompt } from '../core/types.js';
import { TemplateEngine } from '../core/engine.js';

interface InteractiveOptions {
  category?: string;
  type?: string;
  clipboard?: boolean;
  jira?: boolean;
  linear?: boolean;
  github?: boolean;
}

export class InteractiveSelector {
  private registry: TemplateRegistry;
  private engine: TemplateEngine;

  constructor(registry: TemplateRegistry) {
    this.registry = registry;
    this.engine = new TemplateEngine();
  }

  async run(options: InteractiveOptions = {}): Promise<GeneratedPrompt | null> {
    // Step 1: Select template
    const template = await this.selectTemplate(options);
    if (!template) {
      return null;
    }

    console.log(chalk.bold(`\n📝 Selected: ${template.name}`));
    if (template.description) {
      console.log(chalk.gray(template.description));
    }

    // Step 2: Collect variable values
    const context = await this.collectVariables(template);

    // Step 3: Generate prompt
    const generated = this.engine.render(template, context);

    return generated;
  }

  private async selectTemplate(options: InteractiveOptions): Promise<PromptTemplate | null> {
    let templates = this.registry.getAll();

    // Apply filters from options
    if (options.category) {
      templates = templates.filter(t => t.category === options.category);
    }
    if (options.type) {
      templates = templates.filter(t => t.type === options.type);
    }

    if (templates.length === 0) {
      console.log(chalk.yellow('No templates found matching criteria'));
      return null;
    }

    // If only one template, select it automatically
    if (templates.length === 1) {
      return templates[0];
    }

    // Group templates by category
    const byCategory = templates.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = [];
      }
      acc[t.category].push(t);
      return acc;
    }, {} as Record<string, PromptTemplate[]>);

    // Build choices
    const choices: any[] = [];
    for (const [category, categoryTemplates] of Object.entries(byCategory)) {
      choices.push({
        role: 'separator',
        message: chalk.bold.cyan(`\n── ${category.toUpperCase()} ──`),
      });

      for (const template of categoryTemplates) {
        choices.push({
          name: template.id,
          message: `${template.name}${template.description ? chalk.gray(` - ${template.description}`) : ''}`,
          value: template.id,
        });
      }
    }

    const response: any = await prompt({
      type: 'select',
      name: 'templateId',
      message: 'Select a template:',
      choices,
    });

    return this.registry.get(response.templateId) || null;
  }

  private async collectVariables(template: PromptTemplate): Promise<TemplateContext> {
    const context: TemplateContext = {};

    if (!template.variables || template.variables.length === 0) {
      return context;
    }

    console.log(chalk.bold('\n📋 Template Variables:\n'));

    for (const variable of template.variables) {
      const promptConfig: any = {
        type: this.getPromptType(variable.type),
        name: variable.name,
        message: variable.prompt || variable.description || variable.name,
        required: variable.required,
      };

      // Add default value
      if (variable.default !== undefined) {
        promptConfig.initial = variable.default;
      }

      // Add validation
      if (variable.validation) {
        if (variable.validation.enum) {
          promptConfig.type = 'select';
          promptConfig.choices = variable.validation.enum.map(v => ({
            name: String(v),
            value: v,
          }));
        }

        if (variable.validation.pattern) {
          const regex = new RegExp(variable.validation.pattern);
          promptConfig.validate = (value: string) => {
            if (!regex.test(value)) {
              return `Value must match pattern: ${variable.validation!.pattern}`;
            }
            return true;
          };
        }

        if (variable.validation.min !== undefined || variable.validation.max !== undefined) {
          promptConfig.validate = (value: any) => {
            const num = Number(value);
            if (variable.validation!.min !== undefined && num < variable.validation!.min) {
              return `Value must be >= ${variable.validation!.min}`;
            }
            if (variable.validation!.max !== undefined && num > variable.validation!.max) {
              return `Value must be <= ${variable.validation!.max}`;
            }
            return true;
          };
        }
      }

      try {
        const response: any = await prompt(promptConfig);
        context[variable.name] = response[variable.name];
      } catch (error) {
        // User cancelled
        throw new Error('Cancelled by user');
      }
    }

    return context;
  }

  private getPromptType(variableType: string): string {
    switch (variableType) {
      case 'string':
        return 'input';
      case 'number':
        return 'numeral';
      case 'boolean':
        return 'confirm';
      case 'multiline':
      case 'code':
        return 'text';
      case 'array':
        return 'list';
      default:
        return 'input';
    }
  }
}
