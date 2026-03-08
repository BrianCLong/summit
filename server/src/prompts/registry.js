"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptRegistry = exports.PromptRegistry = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const Ajv = ajv_1.default.default || ajv_1.default;
class PromptRegistry {
    prompts = new Map();
    schema = null;
    ajv = new Ajv();
    promptsDir;
    constructor(promptsDir) {
        if (promptsDir) {
            this.promptsDir = promptsDir;
        }
        else {
            const __filename = (0, url_1.fileURLToPath)(import.meta.url);
            const __dirname = path_1.default.dirname(__filename);
            this.promptsDir = __dirname;
        }
    }
    async initialize() {
        try {
            // Load schema
            const schemaPath = path_1.default.join(this.promptsDir, 'schema.json');
            try {
                const schemaContent = await promises_1.default.readFile(schemaPath, 'utf-8');
                this.schema = JSON.parse(schemaContent);
            }
            catch (e) {
                logger_js_1.default.warn('Schema file not found or invalid, proceeding without validation');
            }
            // Load all prompt templates recursively
            await this.loadPromptsRecursively(this.promptsDir);
            logger_js_1.default.info(`Loaded ${this.prompts.size} prompt templates`, {
                templates: Array.from(this.prompts.keys()),
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize prompt registry', {
                error: error.message,
            });
            throw error;
        }
    }
    async loadPromptsRecursively(dir) {
        const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.loadPromptsRecursively(fullPath);
            }
            else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                await this.loadPrompt(fullPath);
            }
        }
    }
    async loadPrompt(filePath) {
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const prompt = js_yaml_1.default.load(content);
            if (!prompt || !prompt.meta || !prompt.meta.id) {
                // Skip files that don't look like prompt configs
                return;
            }
            // Validate against schema
            if (this.schema) {
                const valid = this.ajv.validate(this.schema, prompt);
                if (!valid) {
                    logger_js_1.default.warn(`Invalid prompt schema for ${filePath}: ${this.ajv.errorsText()}`);
                    // We can decide to throw or just warn. For now, let's warn but try to load if id exists.
                }
            }
            this.prompts.set(prompt.meta.id, prompt);
            logger_js_1.default.debug('Loaded prompt template', {
                id: prompt.meta.id,
                file: path_1.default.basename(filePath),
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to load prompt', {
                file: filePath,
                error: error.message,
            });
            // Don't throw here to allow other prompts to load
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
        // Sanitize inputs for prompt injection
        const sanitizedInputs = this.sanitizeInputs(inputs);
        // Simple template rendering (replace {{variable}} with values)
        return this.renderTemplate(prompt.template, sanitizedInputs);
    }
    /**
     * Sanitize inputs to prevent prompt injection attacks.
     * Escapes delimiters and common injection patterns.
     */
    sanitizeInputs(inputs) {
        const sanitized = {};
        for (const [key, value] of Object.entries(inputs)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            }
            else if (Array.isArray(value)) {
                sanitized[key] = value.map(item => typeof item === 'string' ? this.sanitizeString(item) : item);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeInputs(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    sanitizeString(str) {
        // Escape sequences that could be used to break out of prompt sections
        // or simulate system instructions.
        return str
            .replace(/"""/g, '\\"\\"\\"') // Escape triple quotes
            .replace(/```/g, '\\`\\`\\`') // Escape code blocks
            .replace(/<\|endoftext\|>/g, '[END]') // Escape specific tokens
            .replace(/System:/gi, 'System_User_Input:'); // Prevent role impersonation
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
        logger_js_1.default.info('Golden tests completed', {
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
