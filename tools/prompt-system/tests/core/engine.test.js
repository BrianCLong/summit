"use strict";
/**
 * Tests for TemplateEngine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const engine_js_1 = require("../../src/core/engine.js");
(0, globals_1.describe)('TemplateEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = new engine_js_1.TemplateEngine();
    });
    (0, globals_1.describe)('render', () => {
        (0, globals_1.it)('should render template with variables', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Hello {{name}}!',
                variables: [
                    {
                        name: 'name',
                        type: 'string',
                    },
                ],
            };
            const context = {
                name: 'World',
            };
            const result = engine.render(template, context);
            (0, globals_1.expect)(result.content).toBe('Hello World!');
        });
        (0, globals_1.it)('should apply default values', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Hello {{name}}!',
                variables: [
                    {
                        name: 'name',
                        type: 'string',
                        default: 'Default',
                    },
                ],
            };
            const result = engine.render(template, {});
            (0, globals_1.expect)(result.content).toBe('Hello Default!');
        });
        (0, globals_1.it)('should use Handlebars helpers', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: '{{upper text}} and {{lower TEXT}}',
            };
            const result = engine.render(template, {
                text: 'hello',
                TEXT: 'WORLD',
            });
            (0, globals_1.expect)(result.content).toBe('HELLO and world');
        });
        (0, globals_1.it)('should calculate token estimate', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'A'.repeat(400), // ~100 tokens
            };
            const result = engine.render(template, {});
            (0, globals_1.expect)(result.metadata.tokenEstimate).toBeGreaterThan(90);
            (0, globals_1.expect)(result.metadata.tokenEstimate).toBeLessThan(110);
        });
    });
    (0, globals_1.describe)('getMissingVariables', () => {
        (0, globals_1.it)('should identify missing required variables', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Test',
                variables: [
                    {
                        name: 'required1',
                        type: 'string',
                        required: true,
                    },
                    {
                        name: 'required2',
                        type: 'string',
                        required: true,
                    },
                    {
                        name: 'optional',
                        type: 'string',
                        required: false,
                    },
                ],
            };
            const missing = engine.getMissingVariables(template, { required1: 'value' });
            (0, globals_1.expect)(missing).toEqual(['required2']);
        });
    });
    (0, globals_1.describe)('extractVariables', () => {
        (0, globals_1.it)('should extract variable names from content', () => {
            const content = 'Hello {{name}}, you have {{count}} messages in {{folder}}';
            const variables = engine.extractVariables(content);
            (0, globals_1.expect)(variables).toEqual(['name', 'count', 'folder']);
        });
        (0, globals_1.it)('should handle nested properties', () => {
            const content = 'User: {{user.name}}, Email: {{user.email}}';
            const variables = engine.extractVariables(content);
            (0, globals_1.expect)(variables).toEqual(['user', 'user']);
        });
    });
    (0, globals_1.describe)('preview', () => {
        (0, globals_1.it)('should generate preview with sample data', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Name: {{name}}, Count: {{count}}',
                variables: [
                    {
                        name: 'name',
                        type: 'string',
                        default: 'Sample',
                    },
                    {
                        name: 'count',
                        type: 'number',
                    },
                ],
            };
            const result = engine.preview(template);
            (0, globals_1.expect)(result.content).toContain('Sample');
            (0, globals_1.expect)(result.content).toContain('0');
        });
    });
});
