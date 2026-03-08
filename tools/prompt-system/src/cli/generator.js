"use strict";
/**
 * Template generator - non-interactive mode
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateGenerator = void 0;
const fs_1 = require("fs");
const js_yaml_1 = __importDefault(require("js-yaml"));
const engine_js_1 = require("../core/engine.js");
class TemplateGenerator {
    registry;
    engine;
    constructor(registry) {
        this.registry = registry;
        this.engine = new engine_js_1.TemplateEngine();
    }
    async generate(templateId, options = {}) {
        const template = this.registry.getOrThrow(templateId);
        // Build context from options
        const context = await this.buildContext(options);
        // Generate prompt
        const generated = this.engine.render(template, context);
        return generated;
    }
    preview(templateId) {
        const template = this.registry.getOrThrow(templateId);
        return this.engine.preview(template);
    }
    async buildContext(options) {
        let context = {};
        // Load from file if specified
        if (options.file) {
            const fileContent = (0, fs_1.readFileSync)(options.file, 'utf-8');
            const ext = options.file.split('.').pop();
            if (ext === 'json') {
                context = JSON.parse(fileContent);
            }
            else if (ext === 'yaml' || ext === 'yml') {
                context = js_yaml_1.default.load(fileContent);
            }
            else {
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
                }
                catch {
                    // Not JSON, use as string
                    context[key] = value;
                }
            }
        }
        return context;
    }
}
exports.TemplateGenerator = TemplateGenerator;
