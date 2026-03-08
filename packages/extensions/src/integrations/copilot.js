"use strict";
/**
 * Copilot Integration
 *
 * Exposes extension capabilities as copilot tools and skills.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotIntegration = void 0;
const types_js_1 = require("../types.js");
class CopilotIntegration {
    registry;
    tools = new Map();
    skills = new Map();
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Register all copilot capabilities from loaded extensions
     */
    async registerAll() {
        const extensions = this.registry.getByCapability(types_js_1.ExtensionCapability.COPILOT_TOOL);
        for (const ext of extensions) {
            await this.registerExtension(ext);
        }
        console.info(`Registered ${this.tools.size} copilot tools and ${this.skills.size} skills`);
    }
    /**
     * Register a single extension's copilot capabilities
     */
    async registerExtension(ext) {
        const { manifest, module } = ext;
        if (!manifest.copilot) {
            return;
        }
        // Register tools
        if (manifest.copilot.tools) {
            for (const toolDef of manifest.copilot.tools) {
                try {
                    const tool = await this.createTool(ext, toolDef);
                    this.tools.set(tool.name, tool);
                    console.debug(`Registered copilot tool: ${tool.name}`);
                }
                catch (err) {
                    console.error(`Failed to register tool ${toolDef.name}:`, err);
                }
            }
        }
        // Register skills
        if (manifest.copilot.skills) {
            for (const skillDef of manifest.copilot.skills) {
                try {
                    const skill = await this.createSkill(ext, skillDef);
                    this.skills.set(skill.name, skill);
                    console.debug(`Registered copilot skill: ${skill.name}`);
                }
                catch (err) {
                    console.error(`Failed to register skill ${skillDef.name}:`, err);
                }
            }
        }
    }
    /**
     * Create a copilot tool from extension definition
     */
    async createTool(ext, toolDef) {
        const entrypoint = ext.manifest.entrypoints[toolDef.entrypoint];
        if (!entrypoint) {
            throw new Error(`Entrypoint ${toolDef.entrypoint} not found in extension ${ext.manifest.name}`);
        }
        // Get the handler function from the loaded module
        const handler = this.getHandler(ext, entrypoint);
        return {
            name: `${ext.manifest.name}:${toolDef.name}`,
            description: toolDef.description,
            parameters: toolDef.parameters,
            execute: async (params) => {
                console.debug(`Executing tool ${toolDef.name} with params:`, params);
                return await handler(params);
            },
        };
    }
    /**
     * Create a copilot skill from extension definition
     */
    async createSkill(ext, skillDef) {
        const entrypoint = ext.manifest.entrypoints[skillDef.entrypoint];
        if (!entrypoint) {
            throw new Error(`Entrypoint ${skillDef.entrypoint} not found`);
        }
        const handler = this.getHandler(ext, entrypoint);
        return {
            name: `${ext.manifest.name}:${skillDef.name}`,
            description: skillDef.description,
            execute: async (context) => {
                console.debug(`Executing skill ${skillDef.name}`);
                return await handler(context);
            },
        };
    }
    /**
     * Get handler function from extension module
     */
    getHandler(ext, entrypoint) {
        const { module } = ext;
        if (!module) {
            throw new Error(`Extension ${ext.manifest.name} not loaded`);
        }
        const exportName = entrypoint.export || 'default';
        const exported = module[exportName];
        if (!exported) {
            throw new Error(`Export ${exportName} not found in extension module`);
        }
        // If handler name specified, get it from the exported object
        if (entrypoint.handler) {
            const handler = exported[entrypoint.handler];
            if (typeof handler !== 'function') {
                throw new Error(`Handler ${entrypoint.handler} is not a function`);
            }
            return handler.bind(exported);
        }
        // Otherwise, exported itself should be a function
        if (typeof exported !== 'function') {
            throw new Error(`Export ${exportName} is not a function`);
        }
        return exported;
    }
    /**
     * Get all registered tools
     */
    getTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get a tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Get all registered skills
     */
    getSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Get a skill by name
     */
    getSkill(name) {
        return this.skills.get(name);
    }
    /**
     * Execute a tool by name
     */
    async executeTool(name, params) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }
        return await tool.execute(params);
    }
    /**
     * Execute a skill by name
     */
    async executeSkill(name, context) {
        const skill = this.skills.get(name);
        if (!skill) {
            throw new Error(`Skill ${name} not found`);
        }
        return await skill.execute(context);
    }
    /**
     * Unregister all copilot capabilities
     */
    clear() {
        this.tools.clear();
        this.skills.clear();
    }
}
exports.CopilotIntegration = CopilotIntegration;
