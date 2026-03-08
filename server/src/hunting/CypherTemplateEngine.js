"use strict";
/**
 * Cypher Template Engine
 * Manages and executes parameterized Cypher query templates for threat hunting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cypherTemplateEngine = exports.CypherTemplateEngine = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const FORBIDDEN_CLAUSES = [
    'DELETE',
    'DETACH DELETE',
    'REMOVE',
    'SET',
    'CREATE',
    'MERGE',
    'DROP',
    'CALL.*yield.*DELETE',
];
const MAX_QUERY_COMPLEXITY = 100;
const MAX_RESULT_LIMIT = 10000;
class CypherTemplateEngine {
    templates = new Map();
    templateCache = new Map();
    templatesPath;
    constructor(templatesPath) {
        this.templatesPath =
            templatesPath ||
                path_1.default.join(process.cwd(), 'workflows/hunting/cypher-templates');
    }
    /**
     * Initialize the template engine by loading all templates
     */
    async initialize() {
        try {
            await this.loadTemplates();
            logger_js_1.default.info('Cypher template engine initialized', {
                templateCount: this.templates.size,
                categories: this.getAvailableCategories(),
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize Cypher template engine', {
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Load templates from the filesystem
     */
    async loadTemplates() {
        const files = await this.findTemplateFiles(this.templatesPath);
        for (const file of files) {
            try {
                const content = await fs_1.promises.readFile(file, 'utf8');
                const templates = this.parseTemplateFile(content, file);
                for (const template of templates) {
                    this.templates.set(template.name, template);
                }
            }
            catch (error) {
                logger_js_1.default.warn('Failed to load template file', {
                    file,
                    error: error.message,
                });
            }
        }
    }
    /**
     * Find all .cypher template files
     */
    async findTemplateFiles(dir) {
        const files = [];
        try {
            const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findTemplateFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (entry.name.endsWith('.cypher')) {
                    files.push(fullPath);
                }
            }
        }
        catch {
            // Directory might not exist
        }
        return files;
    }
    /**
     * Parse a template file and extract individual templates
     */
    parseTemplateFile(content, filePath) {
        const templates = [];
        const sections = content.split(/\/\/\s*Template:\s*/);
        for (const section of sections.slice(1)) {
            try {
                const template = this.parseTemplateSection(section, filePath);
                if (template) {
                    templates.push(template);
                }
            }
            catch (error) {
                logger_js_1.default.warn('Failed to parse template section', {
                    file: filePath,
                    error: error.message,
                });
            }
        }
        return templates;
    }
    /**
     * Parse a single template section
     */
    parseTemplateSection(section, filePath) {
        const lines = section.trim().split('\n');
        if (lines.length < 2)
            return null;
        const name = lines[0].trim();
        const descriptionMatch = section.match(/\/\/\s*(.+?)(?:\n|$)/g);
        const description = descriptionMatch
            ? descriptionMatch
                .slice(1)
                .map((l) => l.replace(/\/\/\s*/, '').trim())
                .filter((l) => !l.startsWith('Parameters:'))
                .join(' ')
            : '';
        // Extract parameters from comments
        const paramMatch = section.match(/\/\/\s*Parameters:\s*(.+?)(?:\n|$)/);
        const parameters = this.parseParameterComment(paramMatch?.[1] || '');
        // Extract the query (everything after the comments)
        const queryStart = section.indexOf('MATCH');
        const query = queryStart >= 0 ? section.slice(queryStart).trim() : '';
        if (!query)
            return null;
        // Determine category from file path
        const category = this.inferCategory(filePath, name);
        // Extract TTPs from description
        const ttps = this.extractTTPs(description);
        return {
            name,
            description,
            category,
            query,
            parameters,
            estimatedComplexity: this.estimateComplexity(query),
            ttps,
        };
    }
    /**
     * Parse parameter comment string
     */
    parseParameterComment(paramStr) {
        const params = [];
        const paramMatches = paramStr.match(/\$(\w+)/g) || [];
        for (const match of paramMatches) {
            const name = match.slice(1);
            params.push({
                name,
                type: this.inferParameterType(name),
                required: true,
                description: `Parameter: ${name}`,
            });
        }
        return params;
    }
    /**
     * Infer parameter type from name
     */
    inferParameterType(name) {
        if (name.includes('list') || name.includes('ids') || name.includes('array')) {
            return 'array';
        }
        if (name.includes('count') ||
            name.includes('threshold') ||
            name.includes('hours') ||
            name.includes('days') ||
            name.includes('hops') ||
            name.includes('depth')) {
            return 'number';
        }
        if (name.includes('enabled') || name.includes('flag')) {
            return 'boolean';
        }
        return 'string';
    }
    /**
     * Infer template category from file path and name
     */
    inferCategory(filePath, name) {
        const lowerPath = filePath.toLowerCase();
        const lowerName = name.toLowerCase();
        if (lowerPath.includes('ioc') || lowerName.includes('ioc'))
            return 'ioc_hunting';
        if (lowerName.includes('lateral') || lowerName.includes('movement'))
            return 'lateral_movement';
        if (lowerName.includes('credential') || lowerName.includes('privilege'))
            return 'credential_access';
        if (lowerName.includes('exfil') || lowerName.includes('staging'))
            return 'data_exfiltration';
        if (lowerName.includes('persistence') || lowerName.includes('backdoor'))
            return 'persistence';
        if (lowerName.includes('beacon') || lowerName.includes('c2'))
            return 'command_and_control';
        if (lowerName.includes('infrastructure') || lowerName.includes('diamond'))
            return 'infrastructure';
        if (lowerName.includes('supply') || lowerName.includes('vendor'))
            return 'supply_chain';
        if (lowerName.includes('insider') || lowerName.includes('user'))
            return 'insider_threat';
        return 'general';
    }
    /**
     * Extract MITRE ATT&CK TTPs from description
     */
    extractTTPs(description) {
        const ttpPattern = /T\d{4}(?:\.\d{3})?/g;
        return [...new Set(description.match(ttpPattern) || [])];
    }
    /**
     * Estimate query complexity
     */
    estimateComplexity(query) {
        let complexity = 0;
        // Count MATCH clauses
        complexity += (query.match(/MATCH/gi) || []).length * 10;
        // Count variable length paths
        complexity += (query.match(/\*\d*\.\./gi) || []).length * 20;
        // Count WHERE clauses
        complexity += (query.match(/WHERE/gi) || []).length * 5;
        // Count aggregations
        complexity += (query.match(/collect|count|sum|avg|min|max/gi) || []).length * 5;
        // Count UNWIND operations
        complexity += (query.match(/UNWIND/gi) || []).length * 15;
        // Count OPTIONAL MATCH
        complexity += (query.match(/OPTIONAL\s+MATCH/gi) || []).length * 15;
        return complexity;
    }
    /**
     * Generate Cypher query from hypothesis
     */
    async generateQueryFromHypothesis(hypothesis, params = {}) {
        const templateName = hypothesis.requiredQueryTemplate;
        const template = this.templates.get(templateName);
        if (!template) {
            // Try to find a matching template by category or TTP
            const matchingTemplate = this.findMatchingTemplate(hypothesis);
            if (!matchingTemplate) {
                throw new Error(`Template not found: ${templateName}`);
            }
            return this.buildQuery(matchingTemplate, hypothesis.id, params);
        }
        return this.buildQuery(template, hypothesis.id, params);
    }
    /**
     * Find a matching template based on hypothesis characteristics
     */
    findMatchingTemplate(hypothesis) {
        // Try to match by TTP
        for (const ttp of hypothesis.mitreAttackTechniques) {
            for (const template of this.templates.values()) {
                if (template.ttps.includes(ttp.id)) {
                    return template;
                }
            }
        }
        // Try to match by category based on hypothesis statement
        const statement = hypothesis.statement.toLowerCase();
        for (const template of this.templates.values()) {
            if (statement.includes(template.category.replace('_', ' ')) ||
                statement.includes(template.name.replace('_', ' '))) {
                return template;
            }
        }
        return null;
    }
    /**
     * Build a query from template
     */
    buildQuery(template, hypothesisId, params) {
        // Apply default values for missing parameters
        const fullParams = {};
        for (const param of template.parameters) {
            if (params[param.name] !== undefined) {
                fullParams[param.name] = params[param.name];
            }
            else if (param.defaultValue !== undefined) {
                fullParams[param.name] = param.defaultValue;
            }
            else if (param.required) {
                // Use sensible defaults based on type
                fullParams[param.name] = this.getDefaultForType(param.type, param.name);
            }
        }
        // Validate the query
        const validationStatus = this.validateQuery(template.query);
        return {
            id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            hypothesisId,
            query: template.query,
            params: fullParams,
            templateUsed: template.name,
            estimatedComplexity: template.estimatedComplexity,
            estimatedResultSize: this.estimateResultSize(template, fullParams),
            validationStatus,
            validationErrors: validationStatus.isValid
                ? []
                : this.getValidationErrors(template.query),
        };
    }
    /**
     * Get default value for parameter type
     */
    getDefaultForType(type, name) {
        switch (type) {
            case 'number':
                if (name.includes('hours'))
                    return 24;
                if (name.includes('days'))
                    return 7;
                if (name.includes('threshold'))
                    return 10;
                if (name.includes('hops') || name.includes('depth'))
                    return 3;
                return 100;
            case 'boolean':
                return true;
            case 'array':
                return [];
            case 'object':
                return {};
            default:
                return '';
        }
    }
    /**
     * Validate a Cypher query for safety
     */
    validateQuery(query) {
        const upperQuery = query.toUpperCase();
        // Check for forbidden clauses
        const hasForbiddenClauses = FORBIDDEN_CLAUSES.some((clause) => new RegExp(`\\b${clause}\\b`, 'i').test(query));
        // Check for LIMIT clause
        const hasLimit = /\bLIMIT\s+\d+/i.test(query);
        // Calculate complexity
        const complexity = this.estimateComplexity(query);
        // Estimate cost (simplified)
        const estimatedCost = complexity * 10;
        return {
            isValid: !hasForbiddenClauses && complexity <= MAX_QUERY_COMPLEXITY,
            hasLimit,
            isReadOnly: !hasForbiddenClauses,
            complexity,
            estimatedCost,
        };
    }
    /**
     * Get validation errors for a query
     */
    getValidationErrors(query) {
        const errors = [];
        for (const clause of FORBIDDEN_CLAUSES) {
            if (new RegExp(`\\b${clause}\\b`, 'i').test(query)) {
                errors.push(`Forbidden clause detected: ${clause}`);
            }
        }
        const complexity = this.estimateComplexity(query);
        if (complexity > MAX_QUERY_COMPLEXITY) {
            errors.push(`Query complexity (${complexity}) exceeds maximum (${MAX_QUERY_COMPLEXITY})`);
        }
        if (!/\bLIMIT\s+\d+/i.test(query)) {
            errors.push('Query should include a LIMIT clause');
        }
        return errors;
    }
    /**
     * Estimate result size
     */
    estimateResultSize(template, params) {
        // Extract LIMIT if present
        const limitMatch = template.query.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            return Math.min(parseInt(limitMatch[1], 10), MAX_RESULT_LIMIT);
        }
        // Use parameter hints if available
        if (typeof params.limit === 'number') {
            return Math.min(params.limit, MAX_RESULT_LIMIT);
        }
        return 100; // Default estimate
    }
    /**
     * Get template by name
     */
    getTemplate(name) {
        return this.templates.get(name);
    }
    /**
     * Get all templates
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        return Array.from(this.templates.values()).filter((t) => t.category === category);
    }
    /**
     * Get available categories
     */
    getAvailableCategories() {
        return [...new Set(Array.from(this.templates.values()).map((t) => t.category))];
    }
    /**
     * Search templates
     */
    searchTemplates(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.templates.values()).filter((t) => t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.ttps.some((ttp) => ttp.toLowerCase().includes(lowerQuery)));
    }
    /**
     * Add LIMIT clause if missing
     */
    ensureLimit(query, limit = 100) {
        if (/\bLIMIT\s+\d+/i.test(query)) {
            return query;
        }
        return `${query.trim()}\nLIMIT ${limit}`;
    }
    /**
     * Parameterize a raw query
     */
    parameterizeQuery(query, values) {
        let parameterizedQuery = query;
        const params = {};
        let paramIndex = 0;
        // Replace string literals with parameters
        for (const [key, value] of Object.entries(values)) {
            const paramName = `p${paramIndex++}`;
            const placeholder = new RegExp(`\\$${key}\\b`, 'g');
            parameterizedQuery = parameterizedQuery.replace(placeholder, `$${paramName}`);
            params[paramName] = value;
        }
        return { query: parameterizedQuery, params };
    }
}
exports.CypherTemplateEngine = CypherTemplateEngine;
exports.cypherTemplateEngine = new CypherTemplateEngine();
