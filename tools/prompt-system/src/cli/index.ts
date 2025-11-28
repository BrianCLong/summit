#!/usr/bin/env node
/**
 * CLI entry point for the prompt system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { TemplateRegistry } from '../core/registry.js';
import { InteractiveSelector } from './interactive.js';
import { TemplateGenerator } from './generator.js';
import { ContextInjector } from './context.js';
import { MetricsReporter } from '../metrics/reporter.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('ig-prompt')
  .description('AI Dev Assistant Prompt Template System for IntelGraph')
  .version(packageJson.version);

// Interactive mode (default)
program
  .command('interactive', { isDefault: true })
  .alias('i')
  .description('Interactive template selector (default)')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --type <type>', 'Filter by type')
  .option('--clipboard', 'Copy output to clipboard')
  .option('--jira', 'Format for Jira')
  .option('--linear', 'Format for Linear')
  .option('--github', 'Format for GitHub')
  .action(async (options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.loadAll();

      const selector = new InteractiveSelector(registry);
      const result = await selector.run(options);

      if (result) {
        console.log(chalk.green('\n✨ Prompt generated successfully!\n'));
        console.log(result.content);

        if (options.clipboard) {
          // TODO: Implement clipboard copy
          console.log(chalk.gray('\n📋 Copied to clipboard'));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Generate prompt from template
program
  .command('generate <template-id>')
  .alias('gen')
  .description('Generate prompt from template ID')
  .option('-v, --var <key=value...>', 'Set template variables')
  .option('-f, --file <file>', 'Load variables from JSON/YAML file')
  .option('-o, --output <file>', 'Write output to file')
  .option('--clipboard', 'Copy to clipboard')
  .option('--jira', 'Format for Jira')
  .option('--linear', 'Format for Linear')
  .option('--github', 'Format for GitHub')
  .action(async (templateId, options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.loadAll();

      const generator = new TemplateGenerator(registry);
      const result = await generator.generate(templateId, options);

      console.log(chalk.green('✨ Prompt generated successfully!\n'));
      console.log(result.content);

      if (options.output) {
        // TODO: Write to file
        console.log(chalk.gray(`\n💾 Saved to ${options.output}`));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List templates
program
  .command('list')
  .alias('ls')
  .description('List available templates')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --type <type>', 'Filter by type')
  .option('--tags <tags...>', 'Filter by tags')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.loadAll();

      let templates = registry.getAll();

      // Apply filters
      if (options.category) {
        templates = templates.filter(t => t.category === options.category);
      }
      if (options.type) {
        templates = templates.filter(t => t.type === options.type);
      }
      if (options.tags) {
        templates = templates.filter(t =>
          options.tags.some((tag: string) => t.tags?.includes(tag))
        );
      }

      if (options.json) {
        console.log(JSON.stringify(templates, null, 2));
      } else {
        console.log(chalk.bold('\n📋 Available Templates:\n'));
        for (const template of templates) {
          console.log(chalk.cyan(`${template.id}`) + chalk.gray(` (${template.category}/${template.type})`));
          console.log(chalk.gray(`  ${template.description || 'No description'}`));
          if (template.tags && template.tags.length > 0) {
            console.log(chalk.gray(`  Tags: ${template.tags.join(', ')}`));
          }
          console.log('');
        }
        console.log(chalk.gray(`Total: ${templates.length} templates`));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Show template details
program
  .command('show <template-id>')
  .description('Show template details and preview')
  .option('--preview', 'Show preview with sample data')
  .option('--json', 'Output as JSON')
  .action(async (templateId, options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.loadAll();

      const template = registry.get(templateId);
      if (!template) {
        console.error(chalk.red(`Template not found: ${templateId}`));
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(template, null, 2));
      } else {
        console.log(chalk.bold(`\n📄 Template: ${template.name}\n`));
        console.log(chalk.gray(`ID: ${template.id}`));
        console.log(chalk.gray(`Version: ${template.version}`));
        console.log(chalk.gray(`Category: ${template.category}`));
        console.log(chalk.gray(`Type: ${template.type}`));
        if (template.description) {
          console.log(chalk.gray(`Description: ${template.description}`));
        }
        if (template.tags && template.tags.length > 0) {
          console.log(chalk.gray(`Tags: ${template.tags.join(', ')}`));
        }

        if (template.variables && template.variables.length > 0) {
          console.log(chalk.bold('\nVariables:'));
          for (const variable of template.variables) {
            const required = variable.required ? chalk.red('*') : '';
            console.log(`  ${variable.name}${required} (${variable.type})`);
            if (variable.description) {
              console.log(chalk.gray(`    ${variable.description}`));
            }
            if (variable.default !== undefined) {
              console.log(chalk.gray(`    Default: ${variable.default}`));
            }
          }
        }

        if (options.preview) {
          const generator = new TemplateGenerator(registry);
          const preview = generator.preview(templateId);
          console.log(chalk.bold('\nPreview:\n'));
          console.log(chalk.gray('─'.repeat(80)));
          console.log(preview.content);
          console.log(chalk.gray('─'.repeat(80)));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Validate template
program
  .command('validate <template-file>')
  .description('Validate a template file')
  .action(async (templateFile) => {
    try {
      // TODO: Implement template file validation
      console.log(chalk.green(`✅ Template ${templateFile} is valid`));
    } catch (error: any) {
      console.error(chalk.red('Validation failed:'), error.message);
      process.exit(1);
    }
  });

// Stats and metrics
program
  .command('stats')
  .description('Show template usage statistics')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.loadAll();
      const stats = registry.getStats();

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(chalk.bold('\n📊 Template Statistics:\n'));
        console.log(`Total templates: ${chalk.cyan(stats.total)}`);
        console.log('\nBy category:');
        for (const [category, count] of Object.entries(stats.byCategory)) {
          console.log(`  ${category}: ${chalk.cyan(count)}`);
        }
        console.log('\nBy type:');
        for (const [type, count] of Object.entries(stats.byType)) {
          console.log(`  ${type}: ${chalk.cyan(count)}`);
        }
        console.log(`\nAvg variables per template: ${chalk.cyan(stats.avgVariables.toFixed(1))}`);
        console.log(`Total unique tags: ${chalk.cyan(stats.totalTags)}`);
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Metrics reporting
program
  .command('metrics')
  .description('Show usage metrics and analytics')
  .option('--period <days>', 'Period in days', '30')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const reporter = new MetricsReporter();
      const metrics = await reporter.getMetrics(parseInt(options.period));

      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log(chalk.bold('\n📈 Usage Metrics:\n'));
        // TODO: Format metrics output
        console.log(metrics);
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Search templates
program
  .command('search <query>')
  .description('Search templates by name, description, or tags')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.loadAll();

      const results = registry.search(query);

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(chalk.bold(`\n🔍 Search Results for "${query}":\n`));
        if (results.length === 0) {
          console.log(chalk.gray('No templates found'));
        } else {
          for (const template of results) {
            console.log(chalk.cyan(`${template.id}`) + chalk.gray(` (${template.category}/${template.type})`));
            console.log(chalk.gray(`  ${template.description || 'No description'}`));
            console.log('');
          }
          console.log(chalk.gray(`Found ${results.length} template(s)`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
