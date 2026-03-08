"use strict";
/**
 * Prompt Registry - Centralized prompt management with versioning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptRegistry = exports.PromptRegistry = void 0;
const index_js_1 = require("../logging/index.js");
class PromptRegistry {
    prompts;
    versions;
    cache;
    cacheTTL;
    constructor(cacheTTL = 3600000) {
        this.prompts = new Map();
        this.versions = new Map();
        this.cache = new Map();
        this.cacheTTL = cacheTTL;
    }
    async register(template) {
        index_js_1.logger.getLogger().info('Registering prompt template', {
            promptId: template.id,
            name: template.name,
            version: template.version,
        });
        // Validate template
        this.validateTemplate(template);
        // Store template
        const key = this.makeKey(template.name, template.version);
        this.prompts.set(key, template);
        // Store version history
        const version = {
            version: template.version,
            content: template.content,
            createdAt: template.metadata.createdAt,
            createdBy: template.metadata.author,
        };
        const existingVersions = this.versions.get(template.name) || [];
        existingVersions.push(version);
        this.versions.set(template.name, existingVersions);
        index_js_1.logger.getLogger().info('Prompt template registered successfully', {
            promptId: template.id,
        });
    }
    async get(name, version) {
        if (version) {
            const key = this.makeKey(name, version);
            return this.prompts.get(key) || null;
        }
        // Get latest version
        const versions = this.versions.get(name);
        if (!versions || versions.length === 0) {
            return null;
        }
        const latestVersion = versions[versions.length - 1];
        const key = this.makeKey(name, latestVersion.version);
        return this.prompts.get(key) || null;
    }
    async render(name, variables, version) {
        const template = await this.get(name, version);
        if (!template) {
            throw new Error('Prompt template not found: ' + name);
        }
        index_js_1.logger.getLogger().debug('Rendering prompt', {
            name,
            version: version || 'latest',
            variables,
        });
        // Validate variables
        this.validateVariables(template, variables);
        // Render template
        let rendered = template.content;
        for (const variable of template.variables) {
            const value = variables[variable.name] !== undefined
                ? variables[variable.name]
                : variable.default;
            if (value === undefined && variable.required) {
                throw new Error('Required variable missing: ' + variable.name);
            }
            const placeholder = '{{' + variable.name + '}}';
            const stringValue = this.formatValue(value, variable.type);
            rendered = rendered.replace(new RegExp(placeholder, 'g'), stringValue);
        }
        const result = {
            content: rendered,
            metadata: template.metadata,
            variables,
            renderedAt: new Date(),
        };
        index_js_1.logger.getLogger().debug('Prompt rendered successfully', {
            name,
            length: rendered.length,
        });
        return result;
    }
    async list(tags) {
        const templates = Array.from(this.prompts.values());
        if (!tags || tags.length === 0) {
            return templates;
        }
        return templates.filter((template) => tags.some((tag) => template.tags.includes(tag)));
    }
    async delete(name, version) {
        if (version) {
            const key = this.makeKey(name, version);
            return this.prompts.delete(key);
        }
        // Delete all versions
        const versions = this.versions.get(name);
        if (!versions) {
            return false;
        }
        for (const v of versions) {
            const key = this.makeKey(name, v.version);
            this.prompts.delete(key);
        }
        this.versions.delete(name);
        return true;
    }
    async getVersions(name) {
        return this.versions.get(name) || [];
    }
    validateTemplate(template) {
        if (!template.id || !template.name || !template.version) {
            throw new Error('Template must have id, name, and version');
        }
        if (!template.content) {
            throw new Error('Template content cannot be empty');
        }
        // Validate variables
        for (const variable of template.variables) {
            if (!variable.name) {
                throw new Error('Variable must have a name');
            }
            if (variable.validation) {
                // Validate validation rules
                if (variable.validation.pattern) {
                    try {
                        new RegExp(variable.validation.pattern);
                    }
                    catch (error) {
                        throw new Error('Invalid validation pattern for variable: ' + variable.name);
                    }
                }
            }
        }
        // Check for undefined variables in content
        const variablePattern = /\{\{(\w+)\}\}/g;
        const matches = template.content.match(variablePattern);
        if (matches) {
            const definedVars = new Set(template.variables.map((v) => v.name));
            for (const match of matches) {
                const varName = match.slice(2, -2);
                if (!definedVars.has(varName)) {
                    throw new Error('Undefined variable in template: ' + varName);
                }
            }
        }
    }
    validateVariables(template, variables) {
        for (const variable of template.variables) {
            const value = variables[variable.name];
            // Check required
            if (variable.required && value === undefined && variable.default === undefined) {
                throw new Error('Required variable missing: ' + variable.name);
            }
            if (value !== undefined) {
                // Check type
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== variable.type && variable.type !== 'object') {
                    throw new Error('Type mismatch for variable ' + variable.name +
                        ': expected ' + variable.type + ', got ' + actualType);
                }
                // Check validation rules
                if (variable.validation) {
                    this.validateValue(value, variable);
                }
            }
        }
    }
    validateValue(value, variable) {
        const validation = variable.validation;
        // Pattern validation
        if (validation.pattern && typeof value === 'string') {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
                throw new Error('Value for variable ' + variable.name + ' does not match pattern: ' + validation.pattern);
            }
        }
        // Min/max validation
        if (typeof value === 'number') {
            if (validation.min !== undefined && value < validation.min) {
                throw new Error('Value for variable ' + variable.name + ' is below minimum: ' + validation.min);
            }
            if (validation.max !== undefined && value > validation.max) {
                throw new Error('Value for variable ' + variable.name + ' is above maximum: ' + validation.max);
            }
        }
        // Enum validation
        if (validation.enum && !validation.enum.includes(value)) {
            throw new Error('Value for variable ' + variable.name + ' is not in allowed values');
        }
    }
    formatValue(value, type) {
        if (value === null || value === undefined) {
            return '';
        }
        switch (type) {
            case 'string':
                return String(value);
            case 'number':
                return String(value);
            case 'boolean':
                return String(value);
            case 'array':
                return Array.isArray(value) ? value.join(', ') : String(value);
            case 'object':
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            default:
                return String(value);
        }
    }
    makeKey(name, version) {
        return name + '@' + version;
    }
    clearCache() {
        this.cache.clear();
    }
    getStats() {
        let totalVersions = 0;
        for (const versions of this.versions.values()) {
            totalVersions += versions.length;
        }
        return {
            totalPrompts: this.versions.size,
            totalVersions,
            cacheSize: this.cache.size,
        };
    }
}
exports.PromptRegistry = PromptRegistry;
// Singleton instance
exports.promptRegistry = new PromptRegistry();
