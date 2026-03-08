"use strict";
/**
 * Template validation using AJV
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
class TemplateValidator {
    ajv;
    validateTemplate;
    constructor() {
        this.ajv = new ajv_1.default({ allErrors: true, strict: false });
        (0, ajv_formats_1.default)(this.ajv);
        this.loadSchema();
    }
    loadSchema() {
        try {
            const schemaPath = (0, path_1.join)(__dirname, '../../schemas/template.schema.json');
            const schemaContent = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
            const schema = JSON.parse(schemaContent);
            this.validateTemplate = this.ajv.compile(schema);
        }
        catch (error) {
            throw new Error(`Failed to load template schema: ${error}`);
        }
    }
    /**
     * Validate a template against the schema
     */
    validate(template) {
        const valid = this.validateTemplate(template);
        if (valid) {
            return { valid: true };
        }
        const errors = this.validateTemplate.errors?.map((err) => ({
            path: err.instancePath || err.dataPath || 'root',
            message: err.message || 'Unknown error',
        })) || [];
        return {
            valid: false,
            errors,
        };
    }
    /**
     * Validate variable values against template variable definitions
     */
    validateContext(template, context) {
        const errors = [];
        if (!template.variables) {
            return { valid: true };
        }
        // Check required variables
        for (const variable of template.variables) {
            if (variable.required && !(variable.name in context)) {
                errors.push({
                    path: variable.name,
                    message: `Required variable '${variable.name}' is missing`,
                });
                continue;
            }
            const value = context[variable.name];
            if (value === undefined)
                continue;
            // Type validation
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            const expectedTypes = [];
            if (variable.type === 'multiline' || variable.type === 'code') {
                expectedTypes.push('string');
            }
            else {
                expectedTypes.push(variable.type);
            }
            if (!expectedTypes.includes(actualType)) {
                errors.push({
                    path: variable.name,
                    message: `Variable '${variable.name}' should be ${variable.type}, got ${actualType}`,
                });
                continue;
            }
            // Validation rules
            if (variable.validation) {
                const validation = variable.validation;
                if (validation.pattern && typeof value === 'string') {
                    const regex = new RegExp(validation.pattern);
                    if (!regex.test(value)) {
                        errors.push({
                            path: variable.name,
                            message: `Variable '${variable.name}' does not match pattern ${validation.pattern}`,
                        });
                    }
                }
                if (validation.min !== undefined && typeof value === 'number') {
                    if (value < validation.min) {
                        errors.push({
                            path: variable.name,
                            message: `Variable '${variable.name}' must be >= ${validation.min}`,
                        });
                    }
                }
                if (validation.max !== undefined && typeof value === 'number') {
                    if (value > validation.max) {
                        errors.push({
                            path: variable.name,
                            message: `Variable '${variable.name}' must be <= ${validation.max}`,
                        });
                    }
                }
                if (validation.enum && !validation.enum.includes(value)) {
                    errors.push({
                        path: variable.name,
                        message: `Variable '${variable.name}' must be one of: ${validation.enum.join(', ')}`,
                    });
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Validate template content for common issues
     */
    validateContent(template) {
        const errors = [];
        // Check for undefined variables in content
        const variableNames = new Set(template.variables?.map(v => v.name) || []);
        const contentVariables = template.content.match(/\{\{([^}]+)\}\}/g) || [];
        for (const match of contentVariables) {
            const varName = match.replace(/\{\{|\}\}/g, '').trim().split(/[\s.[\]]/).filter(Boolean)[0];
            if (varName && !variableNames.has(varName)) {
                errors.push({
                    path: 'content',
                    message: `Template uses undefined variable: {{${varName}}}`,
                });
            }
        }
        // Check for minimum content length
        if (template.validationRules?.minLength) {
            if (template.content.length < template.validationRules.minLength) {
                errors.push({
                    path: 'content',
                    message: `Content must be at least ${template.validationRules.minLength} characters`,
                });
            }
        }
        // Check for maximum content length
        if (template.validationRules?.maxLength) {
            if (template.content.length > template.validationRules.maxLength) {
                errors.push({
                    path: 'content',
                    message: `Content must not exceed ${template.validationRules.maxLength} characters`,
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Run all validation checks
     */
    validateAll(template, context) {
        const schemaResult = this.validate(template);
        if (!schemaResult.valid) {
            return schemaResult;
        }
        const contentResult = this.validateContent(template);
        if (!contentResult.valid) {
            return contentResult;
        }
        if (context) {
            const contextResult = this.validateContext(template, context);
            if (!contextResult.valid) {
                return contextResult;
            }
        }
        return { valid: true };
    }
}
exports.TemplateValidator = TemplateValidator;
