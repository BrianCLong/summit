"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const registry_js_1 = require("../../prompts/registry.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
(0, globals_1.describe)('Prompt Integrity', () => {
    (0, globals_1.beforeAll)(async () => {
        const candidates = [
            path_1.default.resolve(process.cwd(), 'prompts'),
            path_1.default.resolve(process.cwd(), '..', 'prompts'),
        ];
        let promptsDir = null;
        for (const candidate of candidates) {
            try {
                const stat = await promises_1.default.stat(candidate);
                if (stat.isDirectory()) {
                    promptsDir = candidate;
                    break;
                }
            }
            catch {
                // ignore
            }
        }
        if (!promptsDir) {
            global.testRegistry = null;
            return;
        }
        const registry = new registry_js_1.PromptRegistry(promptsDir);
        await registry.initialize();
        global.testRegistry = registry.getAllPrompts().length ? registry : null;
    });
    (0, globals_1.it)('should load all core prompts', () => {
        const registry = global.testRegistry;
        if (!registry)
            return;
        const coreIds = ['core.base@v1', 'core.security@v1', 'core.coding-standards@v1'];
        for (const id of coreIds) {
            const prompt = registry.getPrompt(id);
            (0, globals_1.expect)(prompt).toBeDefined();
            (0, globals_1.expect)(prompt.meta.id).toBe(id);
        }
    });
    (0, globals_1.it)('should load all agent prompts', () => {
        const registry = global.testRegistry;
        if (!registry)
            return;
        const agentIds = [
            'agent.architect@v1',
            'agent.security@v1',
            'agent.engineer@v1',
            'agent.qa@v1'
        ];
        for (const id of agentIds) {
            const prompt = registry.getPrompt(id);
            (0, globals_1.expect)(prompt).toBeDefined();
            (0, globals_1.expect)(prompt.meta.id).toBe(id);
        }
    });
    (0, globals_1.it)('should load all workflow prompts', () => {
        const registry = global.testRegistry;
        if (!registry)
            return;
        const workflowIds = [
            'workflow.feature@v1',
            'workflow.bugfix@v1',
            'workflow.refactor@v1',
            'workflow.review@v1'
        ];
        for (const id of workflowIds) {
            const prompt = registry.getPrompt(id);
            (0, globals_1.expect)(prompt).toBeDefined();
            (0, globals_1.expect)(prompt.meta.id).toBe(id);
        }
    });
    (0, globals_1.it)('should validate standard inputs in core prompts', () => {
        const registry = global.testRegistry;
        if (!registry)
            return;
        const base = registry.getPrompt('core.base@v1');
        (0, globals_1.expect)(base.inputs).toHaveProperty('role');
        (0, globals_1.expect)(base.inputs).toHaveProperty('mission');
        (0, globals_1.expect)(base.inputs).toHaveProperty('constraints');
    });
});
