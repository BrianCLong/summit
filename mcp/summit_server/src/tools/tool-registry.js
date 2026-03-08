"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const hash_js_1 = require("../utils/hash.js");
class ToolRegistry {
    tools;
    aliases;
    constructor(tools) {
        this.tools = new Map(tools.map((tool) => [tool.schema.id, tool]));
        this.aliases = new Map();
        tools.forEach((tool) => {
            tool.schema.aliases?.forEach((alias) => {
                this.aliases.set(alias, tool.schema.id);
            });
        });
    }
    listIndex() {
        return Array.from(this.tools.values())
            .map((tool) => this.toIndexEntry(tool.schema))
            .sort((a, b) => a.id.localeCompare(b.id));
    }
    getSchema(toolId) {
        const resolvedId = this.aliases.get(toolId) ?? toolId;
        const tool = this.tools.get(resolvedId);
        if (!tool) {
            throw new Error(`Unknown tool: ${toolId}`);
        }
        return tool.schema;
    }
    getSchemaHash(toolId) {
        const schema = this.getSchema(toolId);
        return (0, hash_js_1.hashJson)({
            id: schema.id,
            version: schema.version,
            input: schema.inputJsonSchema,
            output: schema.outputJsonSchema,
        });
    }
    getTool(toolId) {
        const resolvedId = this.aliases.get(toolId) ?? toolId;
        const tool = this.tools.get(resolvedId);
        if (!tool) {
            throw new Error(`Unknown tool: ${toolId}`);
        }
        return tool;
    }
    routeTools(query, limit = 5) {
        const normalized = query.toLowerCase();
        const scored = this.listIndex().map((tool) => {
            const haystack = [
                tool.name,
                tool.description,
                tool.tags.join(' '),
            ]
                .join(' ')
                .toLowerCase();
            const score = normalized
                .split(/\s+/g)
                .filter(Boolean)
                .reduce((total, token) => (haystack.includes(token) ? total + 1 : total), 0);
            return { tool, score };
        });
        return scored
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score || a.tool.id.localeCompare(b.tool.id))
            .slice(0, limit)
            .map((entry) => entry.tool);
    }
    toIndexEntry(schema) {
        return {
            id: schema.id,
            name: schema.name,
            description: schema.description,
            tags: schema.tags,
            riskTier: schema.riskTier,
            requiredScopes: schema.requiredScopes,
            costHint: schema.costHint,
            version: schema.version,
            schemaHash: (0, hash_js_1.hashJson)({
                id: schema.id,
                version: schema.version,
                input: schema.inputJsonSchema,
                output: schema.outputJsonSchema,
            }),
        };
    }
}
exports.ToolRegistry = ToolRegistry;
