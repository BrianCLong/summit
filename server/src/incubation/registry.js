"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeToolRegistry = void 0;
class SafeToolRegistry {
    tools = new Map();
    allowedTools = new Set();
    constructor() {
        // Initialize with some mock safe tools
        this.register('echo', async (args) => args, true);
        this.register('read_context', async () => 'This is a restricted context.', true);
        // Unsafe tool for testing
        this.register('delete_database', async () => { throw new Error('EXECUTED UNSAFE TOOL'); }, false);
    }
    register(name, fn, isAllowed) {
        this.tools.set(name, fn);
        if (isAllowed) {
            this.allowedTools.add(name);
        }
    }
    isAllowed(toolName) {
        return this.allowedTools.has(toolName);
    }
    async execute(toolName, args) {
        if (!this.tools.has(toolName)) {
            throw new Error(`Tool ${toolName} not found.`);
        }
        if (!this.isAllowed(toolName)) {
            throw new Error(`Security Violation: Tool ${toolName} is not allowed in Incubation Sandbox.`);
        }
        return this.tools.get(toolName)(args);
    }
}
exports.SafeToolRegistry = SafeToolRegistry;
