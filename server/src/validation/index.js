"use strict";
/**
 * Centralized Validation Utilities
 *
 * This module exports all validation schemas, validators, and sanitization utilities
 * for use across the application.
 *
 * Usage:
 * ```typescript
 * import { EmailSchema, SanitizationUtils, validateInput } from './validation.js';
 *
 * // Validate email
 * const result = EmailSchema.safeParse(userInput);
 *
 * // Sanitize HTML
 * const safe = SanitizationUtils.sanitizeHTML(untrustedInput);
 *
 * // Validate with helper
 * const validated = await validateInput(EntityIdSchema, params.id);
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryValidator = exports.SanitizationUtils = exports.SecurityValidator = exports.RateLimitValidator = exports.BusinessRuleValidator = exports.GraphQLInputSchema = exports.DateRangeSchema = exports.PhoneNumberSchema = exports.IPAddressSchema = exports.FileUploadSchema = exports.SearchQuerySchema = exports.PaginationSchema = exports.URLSchema = exports.EmailSchema = exports.TokenCountSchema = exports.CostEstimateSchema = exports.BudgetLimitSchema = exports.CustomMetadataSchema = exports.InvestigationStatusSchema = exports.InvestigationNameSchema = exports.RelationshipTypeSchema = exports.EntityPropsSchema = exports.EntityLabelsSchema = exports.EntityKindSchema = exports.TimestampSchema = exports.ConfidenceSchema = exports.EntityIdSchema = exports.TenantIdSchema = void 0;
exports.validateInput = validateInput;
exports.createValidationMiddleware = createValidationMiddleware;
exports.withValidation = withValidation;
exports.validateBatch = validateBatch;
exports.composeValidators = composeValidators;
exports.conditionalValidation = conditionalValidation;
exports.validateInputSafe = validateInputSafe;
// Export all validation schemas
var MutationValidators_js_1 = require("./MutationValidators.js");
Object.defineProperty(exports, "TenantIdSchema", { enumerable: true, get: function () { return MutationValidators_js_1.TenantIdSchema; } });
Object.defineProperty(exports, "EntityIdSchema", { enumerable: true, get: function () { return MutationValidators_js_1.EntityIdSchema; } });
Object.defineProperty(exports, "ConfidenceSchema", { enumerable: true, get: function () { return MutationValidators_js_1.ConfidenceSchema; } });
Object.defineProperty(exports, "TimestampSchema", { enumerable: true, get: function () { return MutationValidators_js_1.TimestampSchema; } });
Object.defineProperty(exports, "EntityKindSchema", { enumerable: true, get: function () { return MutationValidators_js_1.EntityKindSchema; } });
Object.defineProperty(exports, "EntityLabelsSchema", { enumerable: true, get: function () { return MutationValidators_js_1.EntityLabelsSchema; } });
Object.defineProperty(exports, "EntityPropsSchema", { enumerable: true, get: function () { return MutationValidators_js_1.EntityPropsSchema; } });
Object.defineProperty(exports, "RelationshipTypeSchema", { enumerable: true, get: function () { return MutationValidators_js_1.RelationshipTypeSchema; } });
Object.defineProperty(exports, "InvestigationNameSchema", { enumerable: true, get: function () { return MutationValidators_js_1.InvestigationNameSchema; } });
Object.defineProperty(exports, "InvestigationStatusSchema", { enumerable: true, get: function () { return MutationValidators_js_1.InvestigationStatusSchema; } });
Object.defineProperty(exports, "CustomMetadataSchema", { enumerable: true, get: function () { return MutationValidators_js_1.CustomMetadataSchema; } });
Object.defineProperty(exports, "BudgetLimitSchema", { enumerable: true, get: function () { return MutationValidators_js_1.BudgetLimitSchema; } });
Object.defineProperty(exports, "CostEstimateSchema", { enumerable: true, get: function () { return MutationValidators_js_1.CostEstimateSchema; } });
Object.defineProperty(exports, "TokenCountSchema", { enumerable: true, get: function () { return MutationValidators_js_1.TokenCountSchema; } });
Object.defineProperty(exports, "EmailSchema", { enumerable: true, get: function () { return MutationValidators_js_1.EmailSchema; } });
Object.defineProperty(exports, "URLSchema", { enumerable: true, get: function () { return MutationValidators_js_1.URLSchema; } });
Object.defineProperty(exports, "PaginationSchema", { enumerable: true, get: function () { return MutationValidators_js_1.PaginationSchema; } });
Object.defineProperty(exports, "SearchQuerySchema", { enumerable: true, get: function () { return MutationValidators_js_1.SearchQuerySchema; } });
Object.defineProperty(exports, "FileUploadSchema", { enumerable: true, get: function () { return MutationValidators_js_1.FileUploadSchema; } });
Object.defineProperty(exports, "IPAddressSchema", { enumerable: true, get: function () { return MutationValidators_js_1.IPAddressSchema; } });
Object.defineProperty(exports, "PhoneNumberSchema", { enumerable: true, get: function () { return MutationValidators_js_1.PhoneNumberSchema; } });
Object.defineProperty(exports, "DateRangeSchema", { enumerable: true, get: function () { return MutationValidators_js_1.DateRangeSchema; } });
Object.defineProperty(exports, "GraphQLInputSchema", { enumerable: true, get: function () { return MutationValidators_js_1.GraphQLInputSchema; } });
// Export validator classes
var MutationValidators_js_2 = require("./MutationValidators.js");
Object.defineProperty(exports, "BusinessRuleValidator", { enumerable: true, get: function () { return MutationValidators_js_2.BusinessRuleValidator; } });
Object.defineProperty(exports, "RateLimitValidator", { enumerable: true, get: function () { return MutationValidators_js_2.RateLimitValidator; } });
Object.defineProperty(exports, "SecurityValidator", { enumerable: true, get: function () { return MutationValidators_js_2.SecurityValidator; } });
Object.defineProperty(exports, "SanitizationUtils", { enumerable: true, get: function () { return MutationValidators_js_2.SanitizationUtils; } });
Object.defineProperty(exports, "QueryValidator", { enumerable: true, get: function () { return MutationValidators_js_2.QueryValidator; } });
const zod_1 = require("zod");
const graphql_1 = require("graphql");
/**
 * Helper function to validate input against a Zod schema
 * Throws GraphQLError if validation fails
 */
function validateInput(schema, data, errorMessage) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new graphql_1.GraphQLError(errorMessage || `Validation failed: ${errors}`, {
            extensions: { code: 'BAD_USER_INPUT', validationErrors: result.error.issues },
        });
    }
    return result.data;
}
/**
 * Express middleware for request validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createValidationMiddleware(schema, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dataExtractor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req, res, next) => {
        try {
            const data = dataExtractor(req);
            const validated = validateInput(schema, data);
            req.validated = validated;
            next();
        }
        catch (error) {
            if (error instanceof graphql_1.GraphQLError) {
                res.status(400).json({
                    error: error.message,
                    details: error.extensions,
                });
            }
            else {
                next(error);
            }
        }
    };
}
/**
   * GraphQL resolver wrapper with automatic validation
   */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withValidation(schema, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
resolver) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (parent, args, context, info) => {
        const validatedArgs = validateInput(schema, args);
        return resolver(parent, validatedArgs, context, info);
    };
}
/**
 * Batch validation for arrays of inputs
 */
function validateBatch(schema, items, options) {
    const valid = [];
    const errors = [];
    for (let i = 0; i < items.length; i++) {
        const result = schema.safeParse(items[i]);
        if (result.success) {
            valid.push(result.data);
        }
        else {
            errors.push({ index: i, errors: result.error });
            if (options?.stopOnFirstError) {
                break;
            }
        }
    }
    return { valid, errors };
}
/**
 * Compose multiple validation schemas
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function composeValidators(...validators) {
    return validators.reduce((acc, validator) => acc.and(validator));
}
/**
 * Create a conditional validator
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function conditionalValidation(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
condition, schemaTrue, schemaFalse) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return zod_1.z.any().transform((data) => {
        const schema = condition(data) ? schemaTrue : schemaFalse;
        return schema.parse(data);
    });
}
// Add a safe version of validateInput that returns a result object
function validateInputSafe(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    else {
        return { success: false, errors: result.error };
    }
}
