"use strict";
/**
 * Template Registry - Manages loading, caching, and retrieval of templates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRegistry = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const js_yaml_1 = __importDefault(require("js-yaml"));
const validator_js_1 = require("./validator.js");
const composer_js_1 = require("./composer.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
class TemplateRegistry {
    templates = new Map();
    templatesDir;
    validator;
    composer;
    constructor(templatesDir) {
        this.templatesDir = templatesDir || (0, path_1.join)(__dirname, '../../templates');
        this.validator = new validator_js_1.TemplateValidator();
        this.composer = new composer_js_1.TemplateComposer(this);
    }
    /**
     * Load all templates from the templates directory
     */
    async loadAll() {
        const categories = ['core', 'specialized', 'meta', 'custom'];
        for (const category of categories) {
            const categoryDir = (0, path_1.join)(this.templatesDir, category);
            if (!(0, fs_1.existsSync)(categoryDir))
                continue;
            const files = (0, fs_1.readdirSync)(categoryDir);
            for (const file of files) {
                const filePath = (0, path_1.join)(categoryDir, file);
                const stats = (0, fs_1.statSync)(filePath);
                if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml'))) {
                    try {
                        const template = this.loadTemplateFile(filePath);
                        this.register(template);
                    }
                    catch (error) {
                        console.warn(`Failed to load template ${file}:`, error);
                    }
                }
            }
        }
    }
    /**
     * Load a single template file
     */
    loadTemplateFile(filePath) {
        const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
        const ext = (0, path_1.extname)(filePath);
        if (ext === '.md') {
            return this.parseMarkdownTemplate(content, filePath);
        }
        else if (ext === '.yaml' || ext === '.yml') {
            return this.parseYamlTemplate(content);
        }
        else {
            throw new Error(`Unsupported template file format: ${ext}`);
        }
    }
    /**
     * Parse markdown template with YAML frontmatter
     */
    parseMarkdownTemplate(content, filePath) {
        const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            throw new Error('Markdown template must have YAML frontmatter');
        }
        const frontmatter = js_yaml_1.default.load(frontmatterMatch[1]);
        const templateContent = frontmatterMatch[2].trim();
        const template = {
            ...frontmatter,
            content: templateContent,
        };
        return template;
    }
    /**
     * Parse YAML template file
     */
    parseYamlTemplate(content) {
        const template = js_yaml_1.default.load(content);
        return template;
    }
    /**
     * Register a template
     */
    register(template) {
        // Validate template
        const validation = this.validator.validate(template);
        if (!validation.valid) {
            throw new Error(`Template validation failed for ${template.id}:\n${validation.errors?.map(e => `  ${e.path}: ${e.message}`).join('\n')}`);
        }
        this.templates.set(template.id, template);
    }
    /**
     * Get template by ID
     */
    get(id) {
        return this.templates.get(id);
    }
    /**
     * Get template by ID or throw error
     */
    getOrThrow(id) {
        const template = this.get(id);
        if (!template) {
            throw new Error(`Template not found: ${id}`);
        }
        return template;
    }
    /**
     * Get all templates
     */
    getAll() {
        return Array.from(this.templates.values());
    }
    /**
     * Get templates by category
     */
    getByCategory(category) {
        return this.getAll().filter(t => t.category === category);
    }
    /**
     * Get templates by type
     */
    getByType(type) {
        return this.getAll().filter(t => t.type === type);
    }
    /**
     * Search templates by tags
     */
    searchByTags(tags) {
        return this.getAll().filter(template => {
            if (!template.tags)
                return false;
            return tags.some(tag => template.tags.includes(tag));
        });
    }
    /**
     * Search templates by name or description
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(template => {
            const nameMatch = template.name.toLowerCase().includes(lowerQuery);
            const descMatch = template.description?.toLowerCase().includes(lowerQuery);
            const tagMatch = template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
            return nameMatch || descMatch || tagMatch;
        });
    }
    /**
     * Get template with composition (extends + mixins)
     */
    async getComposed(id) {
        const template = this.getOrThrow(id);
        return this.composer.compose(template);
    }
    /**
     * Get template statistics
     */
    getStats() {
        const all = this.getAll();
        return {
            total: all.length,
            byCategory: {
                core: this.getByCategory('core').length,
                specialized: this.getByCategory('specialized').length,
                meta: this.getByCategory('meta').length,
                custom: this.getByCategory('custom').length,
            },
            byType: all.reduce((acc, t) => {
                acc[t.type] = (acc[t.type] || 0) + 1;
                return acc;
            }, {}),
            avgVariables: all.reduce((sum, t) => sum + (t.variables?.length || 0), 0) / all.length,
            totalTags: new Set(all.flatMap(t => t.tags || [])).size,
        };
    }
    /**
     * Clear all templates
     */
    clear() {
        this.templates.clear();
    }
}
exports.TemplateRegistry = TemplateRegistry;
