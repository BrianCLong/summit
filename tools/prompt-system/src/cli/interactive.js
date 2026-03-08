"use strict";
/**
 * Interactive template selector
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveSelector = void 0;
const enquirer_1 = require("enquirer");
const chalk_1 = __importDefault(require("chalk"));
const engine_js_1 = require("../core/engine.js");
class InteractiveSelector {
    registry;
    engine;
    constructor(registry) {
        this.registry = registry;
        this.engine = new engine_js_1.TemplateEngine();
    }
    async run(options = {}) {
        // Step 1: Select template
        const template = await this.selectTemplate(options);
        if (!template) {
            return null;
        }
        console.log(chalk_1.default.bold(`\n📝 Selected: ${template.name}`));
        if (template.description) {
            console.log(chalk_1.default.gray(template.description));
        }
        // Step 2: Collect variable values
        const context = await this.collectVariables(template);
        // Step 3: Generate prompt
        const generated = this.engine.render(template, context);
        return generated;
    }
    async selectTemplate(options) {
        let templates = this.registry.getAll();
        // Apply filters from options
        if (options.category) {
            templates = templates.filter(t => t.category === options.category);
        }
        if (options.type) {
            templates = templates.filter(t => t.type === options.type);
        }
        if (templates.length === 0) {
            console.log(chalk_1.default.yellow('No templates found matching criteria'));
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
        }, {});
        // Build choices
        const choices = [];
        for (const [category, categoryTemplates] of Object.entries(byCategory)) {
            choices.push({
                role: 'separator',
                message: chalk_1.default.bold.cyan(`\n── ${category.toUpperCase()} ──`),
            });
            for (const template of categoryTemplates) {
                choices.push({
                    name: template.id,
                    message: `${template.name}${template.description ? chalk_1.default.gray(` - ${template.description}`) : ''}`,
                    value: template.id,
                });
            }
        }
        const response = await (0, enquirer_1.prompt)({
            type: 'select',
            name: 'templateId',
            message: 'Select a template:',
            choices,
        });
        return this.registry.get(response.templateId) || null;
    }
    async collectVariables(template) {
        const context = {};
        if (!template.variables || template.variables.length === 0) {
            return context;
        }
        console.log(chalk_1.default.bold('\n📋 Template Variables:\n'));
        for (const variable of template.variables) {
            const promptConfig = {
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
                    promptConfig.validate = (value) => {
                        if (!regex.test(value)) {
                            return `Value must match pattern: ${variable.validation.pattern}`;
                        }
                        return true;
                    };
                }
                if (variable.validation.min !== undefined || variable.validation.max !== undefined) {
                    promptConfig.validate = (value) => {
                        const num = Number(value);
                        if (variable.validation.min !== undefined && num < variable.validation.min) {
                            return `Value must be >= ${variable.validation.min}`;
                        }
                        if (variable.validation.max !== undefined && num > variable.validation.max) {
                            return `Value must be <= ${variable.validation.max}`;
                        }
                        return true;
                    };
                }
            }
            try {
                const response = await (0, enquirer_1.prompt)(promptConfig);
                context[variable.name] = response[variable.name];
            }
            catch (error) {
                // User cancelled
                throw new Error('Cancelled by user');
            }
        }
        return context;
    }
    getPromptType(variableType) {
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
exports.InteractiveSelector = InteractiveSelector;
