"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptRegistry = exports.PromptRegistry = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const logger_js_1 = require("../utils/logger.js");
const Ajv = ajv_1.default.default || ajv_1.default;
class PromptRegistry {
    prompts = new Map();
    schema = null;
    ajv = new Ajv();
    promptsDir;
    constructor(promptsDir = './prompts') {
        this.promptsDir = promptsDir;
    }
    async initialize() {
        try {
            // Load schema
            const schemaPath = path_1.default.join(this.promptsDir, 'schema.json');
            const schemaContent = await promises_1.default.readFile(schemaPath, 'utf-8');
            this.schema = JSON.parse(schemaContent);
            // Load all prompt templates
            const files = await promises_1.default.readdir(this.promptsDir);
            const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
            for (const file of yamlFiles) {
                await this.loadPrompt(path_1.default.join(this.promptsDir, file));
            }
            logger_js_1.logger.info(`Loaded ${this.prompts.size} prompt templates`, {
                templates: Array.from(this.prompts.keys()),
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to initialize prompt registry', {
                error: error.message,
            });
            throw error;
        }
    }
    async loadPrompt(filePath) {
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const prompt = js_yaml_1.default.load(content);
            // Validate against schema
            if (this.schema) {
                const valid = this.ajv.validate(this.schema, prompt);
                if (!valid) {
                    throw new Error(`Invalid prompt schema: ${this.ajv.errorsText()}`);
                }
            }
            this.prompts.set(prompt.meta.id, prompt);
            logger_js_1.logger.debug('Loaded prompt template', {
                id: prompt.meta.id,
                file: path_1.default.basename(filePath),
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to load prompt', {
                file: filePath,
                error: error.message,
            });
            throw error;
        }
    }
    getPrompt(id) {
        return this.prompts.get(id) || null;
    }
    getAllPrompts() {
        return Array.from(this.prompts.values());
    }
    render(id, inputs) {
        const prompt = this.getPrompt(id);
        if (!prompt) {
            throw new Error(`Prompt not found: ${id}`);
        }
        // Validate inputs
        this.validateInputs(prompt, inputs);
        // Simple template rendering (replace {{variable}} with values)
        return this.renderTemplate(prompt.template, inputs);
    }
    validateInputs(prompt, inputs) {
        const required = Object.keys(prompt.inputs);
        const missing = required.filter((key) => !(key in inputs));
        if (missing.length > 0) {
            throw new Error(`Missing required inputs: ${missing.join(', ')}`);
        }
        // Type validation
        for (const [key, expectedType] of Object.entries(prompt.inputs)) {
            const value = inputs[key];
            if (!this.validateType(value, expectedType)) {
                throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${typeof value}`);
            }
        }
    }
    validateType(value, expectedType) {
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
    renderTemplate(template, inputs) {
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
    formatValue(value) {
        if (Array.isArray(value)) {
            return value.join('\n');
        }
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }
    renderArrays(template, inputs) {
        // Simple array iteration: {{#arrayName}}{{.}}{{/arrayName}}
        return template.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, arrayName, itemTemplate) => {
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
                        rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
                    }
                    return rendered;
                }
                else {
                    // Replace {{.}} with item value
                    return itemTemplate.replace(/{{\.}}/g, String(item));
                }
            })
                .join('');
        });
    }
    async runGoldenTests(promptId) {
        const results = [];
        const promptsToTest = promptId
            ? [this.getPrompt(promptId)].filter(Boolean)
            : this.getAllPrompts();
        for (const prompt of promptsToTest) {
            if (!prompt.examples?.length) {
                continue;
            }
            for (const example of prompt.examples) {
                try {
                    const rendered = this.render(prompt.meta.id, example.inputs);
                    let passed = true;
                    let missing = [];
                    if (example.expected_contains) {
                        passed = example.expected_contains.every((expected) => rendered.includes(expected));
                        if (!passed) {
                            missing = example.expected_contains.filter((expected) => !rendered.includes(expected));
                        }
                    }
                    results.push({
                        promptId: prompt.meta.id,
                        exampleName: example.name,
                        passed,
                        rendered,
                        expectedContains: example.expected_contains || [],
                        missingExpected: missing,
                    });
                }
                catch (error) {
                    results.push({
                        promptId: prompt.meta.id,
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
        logger_js_1.logger.info('Golden tests completed', {
            passed,
            total,
            successRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
        });
        return results;
    }
    async reloadPrompts() {
        this.prompts.clear();
        await this.initialize();
    }
}
exports.PromptRegistry = PromptRegistry;
exports.promptRegistry = new PromptRegistry();
