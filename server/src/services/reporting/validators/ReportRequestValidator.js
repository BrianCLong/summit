"use strict";
/**
 * Report Request Validator
 * Validates report generation requests before processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRequestValidator = exports.ValidationError = void 0;
class ValidationError extends Error {
    field;
    code;
    constructor(message, field, code) {
        super(message);
        this.field = field;
        this.code = code;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ReportRequestValidator {
    /**
     * Validate a report generation request against a template
     */
    static validate(request, template) {
        // Validate template ID
        if (!request.templateId) {
            throw new ValidationError('Template ID is required', 'templateId', 'REQUIRED');
        }
        // Validate user ID
        if (!request.userId) {
            throw new ValidationError('User ID is required', 'userId', 'REQUIRED');
        }
        // Validate parameters
        this.validateParameters(request.parameters || {}, template.parameters || []);
        // Validate format
        if (request.format) {
            this.validateFormat(request.format, template.outputFormats || template.exportFormats || []);
        }
    }
    /**
     * Validate report parameters against template requirements
     */
    static validateParameters(provided, required) {
        for (const param of required) {
            const value = provided[param.name];
            // Check required parameters
            if (param.required && (value === undefined || value === null)) {
                throw new ValidationError(`Required parameter '${param.name}' is missing`, param.name, 'REQUIRED');
            }
            // Skip validation if parameter not provided and not required
            if (value === undefined || value === null) {
                continue;
            }
            // Type validation
            this.validateParameterType(param.name, value, param.type);
            // Range validation
            if (param.type === 'integer' || param.type === 'float') {
                if (param.min !== undefined && value < param.min) {
                    throw new ValidationError(`Parameter '${param.name}' must be >= ${param.min}`, param.name, 'MIN_VALUE');
                }
                if (param.max !== undefined && value > param.max) {
                    throw new ValidationError(`Parameter '${param.name}' must be <= ${param.max}`, param.name, 'MAX_VALUE');
                }
            }
            // Enum validation
            if (param.type === 'enum' && param.options) {
                if (!param.options.includes(value)) {
                    throw new ValidationError(`Parameter '${param.name}' must be one of: ${param.options.join(', ')}`, param.name, 'INVALID_ENUM');
                }
            }
        }
    }
    /**
     * Validate parameter type
     */
    static validateParameterType(name, value, expectedType) {
        switch (expectedType) {
            case 'string':
                if (typeof value !== 'string') {
                    throw new ValidationError(`Parameter '${name}' must be a string`, name, 'INVALID_TYPE');
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    throw new ValidationError(`Parameter '${name}' must be a boolean`, name, 'INVALID_TYPE');
                }
                break;
            case 'integer':
                if (!Number.isInteger(value)) {
                    throw new ValidationError(`Parameter '${name}' must be an integer`, name, 'INVALID_TYPE');
                }
                break;
            case 'float':
                if (typeof value !== 'number' || isNaN(value)) {
                    throw new ValidationError(`Parameter '${name}' must be a number`, name, 'INVALID_TYPE');
                }
                break;
            case 'daterange':
                if (!value || !value.start || !value.end) {
                    throw new ValidationError(`Parameter '${name}' must be a date range with start and end dates`, name, 'INVALID_TYPE');
                }
                break;
        }
    }
    /**
     * Validate export format against supported formats
     */
    static validateFormat(format, supportedFormats) {
        const normalizedFormat = format.toUpperCase();
        const normalizedSupported = supportedFormats.map((f) => f.toUpperCase());
        if (!normalizedSupported.includes(normalizedFormat)) {
            throw new ValidationError(`Format '${format}' is not supported. Supported formats: ${supportedFormats.join(', ')}`, 'format', 'INVALID_FORMAT');
        }
    }
}
exports.ReportRequestValidator = ReportRequestValidator;
