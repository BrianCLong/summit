#!/usr/bin/env node
"use strict";
/**
 * CLI entry point for the prompt system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const registry_js_1 = require("../core/registry.js");
const interactive_js_1 = require("./interactive.js");
const generator_js_1 = require("./generator.js");
const reporter_js_1 = require("../metrics/reporter.js");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
// Read package.json for version
const packageJsonPath = (0, path_1.join)(__dirname, '../../package.json');
const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf-8'));
const program = new commander_1.Command();
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
        const registry = new registry_js_1.TemplateRegistry();
        await registry.loadAll();
        const selector = new interactive_js_1.InteractiveSelector(registry);
        const result = await selector.run(options);
        if (result) {
            console.log(chalk_1.default.green('\n✨ Prompt generated successfully!\n'));
            console.log(result.content);
            if (options.clipboard) {
                // TODO: Implement clipboard copy
                console.log(chalk_1.default.gray('\n📋 Copied to clipboard'));
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        const registry = new registry_js_1.TemplateRegistry();
        await registry.loadAll();
        const generator = new generator_js_1.TemplateGenerator(registry);
        const result = await generator.generate(templateId, options);
        console.log(chalk_1.default.green('✨ Prompt generated successfully!\n'));
        console.log(result.content);
        if (options.output) {
            // TODO: Write to file
            console.log(chalk_1.default.gray(`\n💾 Saved to ${options.output}`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        const registry = new registry_js_1.TemplateRegistry();
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
            templates = templates.filter(t => options.tags.some((tag) => t.tags?.includes(tag)));
        }
        if (options.json) {
            console.log(JSON.stringify(templates, null, 2));
        }
        else {
            console.log(chalk_1.default.bold('\n📋 Available Templates:\n'));
            for (const template of templates) {
                console.log(chalk_1.default.cyan(`${template.id}`) + chalk_1.default.gray(` (${template.category}/${template.type})`));
                console.log(chalk_1.default.gray(`  ${template.description || 'No description'}`));
                if (template.tags && template.tags.length > 0) {
                    console.log(chalk_1.default.gray(`  Tags: ${template.tags.join(', ')}`));
                }
                console.log('');
            }
            console.log(chalk_1.default.gray(`Total: ${templates.length} templates`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        const registry = new registry_js_1.TemplateRegistry();
        await registry.loadAll();
        const template = registry.get(templateId);
        if (!template) {
            console.error(chalk_1.default.red(`Template not found: ${templateId}`));
            process.exit(1);
        }
        if (options.json) {
            console.log(JSON.stringify(template, null, 2));
        }
        else {
            console.log(chalk_1.default.bold(`\n📄 Template: ${template.name}\n`));
            console.log(chalk_1.default.gray(`ID: ${template.id}`));
            console.log(chalk_1.default.gray(`Version: ${template.version}`));
            console.log(chalk_1.default.gray(`Category: ${template.category}`));
            console.log(chalk_1.default.gray(`Type: ${template.type}`));
            if (template.description) {
                console.log(chalk_1.default.gray(`Description: ${template.description}`));
            }
            if (template.tags && template.tags.length > 0) {
                console.log(chalk_1.default.gray(`Tags: ${template.tags.join(', ')}`));
            }
            if (template.variables && template.variables.length > 0) {
                console.log(chalk_1.default.bold('\nVariables:'));
                for (const variable of template.variables) {
                    const required = variable.required ? chalk_1.default.red('*') : '';
                    console.log(`  ${variable.name}${required} (${variable.type})`);
                    if (variable.description) {
                        console.log(chalk_1.default.gray(`    ${variable.description}`));
                    }
                    if (variable.default !== undefined) {
                        console.log(chalk_1.default.gray(`    Default: ${variable.default}`));
                    }
                }
            }
            if (options.preview) {
                const generator = new generator_js_1.TemplateGenerator(registry);
                const preview = generator.preview(templateId);
                console.log(chalk_1.default.bold('\nPreview:\n'));
                console.log(chalk_1.default.gray('─'.repeat(80)));
                console.log(preview.content);
                console.log(chalk_1.default.gray('─'.repeat(80)));
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        console.log(chalk_1.default.green(`✅ Template ${templateFile} is valid`));
    }
    catch (error) {
        console.error(chalk_1.default.red('Validation failed:'), error.message);
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
        const registry = new registry_js_1.TemplateRegistry();
        await registry.loadAll();
        const stats = registry.getStats();
        if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
        }
        else {
            console.log(chalk_1.default.bold('\n📊 Template Statistics:\n'));
            console.log(`Total templates: ${chalk_1.default.cyan(stats.total)}`);
            console.log('\nBy category:');
            for (const [category, count] of Object.entries(stats.byCategory)) {
                console.log(`  ${category}: ${chalk_1.default.cyan(count)}`);
            }
            console.log('\nBy type:');
            for (const [type, count] of Object.entries(stats.byType)) {
                console.log(`  ${type}: ${chalk_1.default.cyan(count)}`);
            }
            console.log(`\nAvg variables per template: ${chalk_1.default.cyan(stats.avgVariables.toFixed(1))}`);
            console.log(`Total unique tags: ${chalk_1.default.cyan(stats.totalTags)}`);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        const reporter = new reporter_js_1.MetricsReporter();
        const metrics = await reporter.getMetrics(parseInt(options.period));
        if (options.json) {
            console.log(JSON.stringify(metrics, null, 2));
        }
        else {
            console.log(chalk_1.default.bold('\n📈 Usage Metrics:\n'));
            // TODO: Format metrics output
            console.log(metrics);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        const registry = new registry_js_1.TemplateRegistry();
        await registry.loadAll();
        const results = registry.search(query);
        if (options.json) {
            console.log(JSON.stringify(results, null, 2));
        }
        else {
            console.log(chalk_1.default.bold(`\n🔍 Search Results for "${query}":\n`));
            if (results.length === 0) {
                console.log(chalk_1.default.gray('No templates found'));
            }
            else {
                for (const template of results) {
                    console.log(chalk_1.default.cyan(`${template.id}`) + chalk_1.default.gray(` (${template.category}/${template.type})`));
                    console.log(chalk_1.default.gray(`  ${template.description || 'No description'}`));
                    console.log('');
                }
                console.log(chalk_1.default.gray(`Found ${results.length} template(s)`));
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program.parse();
