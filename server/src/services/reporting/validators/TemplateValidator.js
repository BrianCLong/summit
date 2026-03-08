"use strict";
/**
 * Template Validator
 * Validates report template configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateValidator = void 0;
const ReportRequestValidator_js_1 = require("./ReportRequestValidator.js");
class TemplateValidator {
    static VALID_FORMATS = ['pdf', 'docx', 'html', 'json', 'csv', 'xlsx', 'pptx', 'gexf'];
    /**
     * Validate custom template creation request
     */
    static validateCustomTemplate(data) {
        // Validate name
        if (!data.name || data.name.trim().length === 0) {
            throw new ReportRequestValidator_js_1.ValidationError('Template name is required and cannot be empty', 'name', 'REQUIRED');
        }
        if (data.name.length > 200) {
            throw new ReportRequestValidator_js_1.ValidationError('Template name must not exceed 200 characters', 'name', 'MAX_LENGTH');
        }
        // Validate sections
        if (!Array.isArray(data.sections) || data.sections.length === 0) {
            throw new ReportRequestValidator_js_1.ValidationError('Template must have at least one section', 'sections', 'REQUIRED');
        }
        // Validate section names
        for (const section of data.sections) {
            if (typeof section !== 'string' || section.trim().length === 0) {
                throw new ReportRequestValidator_js_1.ValidationError('All section names must be non-empty strings', 'sections', 'INVALID_FORMAT');
            }
        }
        // Validate export formats if provided
        if (data.exportFormats) {
            if (!Array.isArray(data.exportFormats)) {
                throw new ReportRequestValidator_js_1.ValidationError('exportFormats must be an array', 'exportFormats', 'INVALID_TYPE');
            }
            for (const format of data.exportFormats) {
                if (!this.VALID_FORMATS.includes(format.toLowerCase())) {
                    throw new ReportRequestValidator_js_1.ValidationError(`Invalid export format '${format}'. Valid formats: ${this.VALID_FORMATS.join(', ')}`, 'exportFormats', 'INVALID_FORMAT');
                }
            }
        }
        // Validate description length if provided
        if (data.description && data.description.length > 1000) {
            throw new ReportRequestValidator_js_1.ValidationError('Template description must not exceed 1000 characters', 'description', 'MAX_LENGTH');
        }
    }
    /**
     * Validate section name format
     */
    static isValidSectionName(name) {
        return /^[a-z_][a-z0-9_]*$/.test(name);
    }
}
exports.TemplateValidator = TemplateValidator;
