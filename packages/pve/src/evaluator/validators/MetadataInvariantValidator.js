"use strict";
// @ts-nocheck
/**
 * Metadata Invariant Validator
 *
 * Validates metadata against defined invariants and rules.
 *
 * @module pve/evaluator/validators/MetadataInvariantValidator
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataInvariantValidator = void 0;
const PolicyResult_js_1 = require("../PolicyResult.js");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const BUILT_IN_INVARIANTS = [
    {
        id: 'entity.core',
        name: 'Core Entity Invariants',
        entityTypes: ['*'],
        rules: [
            { field: 'id', rule: 'required', config: null },
            { field: 'type', rule: 'required', config: null },
            { field: 'createdAt', rule: 'type', config: { type: 'string', format: 'date-time' } },
            { field: 'updatedAt', rule: 'type', config: { type: 'string', format: 'date-time' } },
        ],
    },
    {
        id: 'entity.person',
        name: 'Person Entity Invariants',
        entityTypes: ['person', 'individual', 'actor'],
        rules: [
            { field: 'name', rule: 'required', config: null },
            { field: 'name', rule: 'pattern', config: { pattern: '^[\\p{L}\\s\\-\\.\']+$' } },
        ],
    },
    {
        id: 'entity.organization',
        name: 'Organization Entity Invariants',
        entityTypes: ['organization', 'company', 'group'],
        rules: [
            { field: 'name', rule: 'required', config: null },
            { field: 'jurisdiction', rule: 'type', config: { type: 'string' } },
        ],
    },
    {
        id: 'entity.location',
        name: 'Location Entity Invariants',
        entityTypes: ['location', 'place', 'address'],
        rules: [
            { field: 'coordinates', rule: 'type', config: { type: 'object' } },
            {
                field: 'coordinates.latitude',
                rule: 'range',
                config: { min: -90, max: 90 },
            },
            {
                field: 'coordinates.longitude',
                rule: 'range',
                config: { min: -180, max: 180 },
            },
        ],
    },
    {
        id: 'classification',
        name: 'Classification Invariants',
        entityTypes: ['*'],
        rules: [
            {
                field: 'classification',
                rule: 'enum',
                config: { values: ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'] },
            },
        ],
    },
];
class MetadataInvariantValidator {
    config;
    ajv;
    invariants;
    constructor(config = {}) {
        this.config = {
            builtInInvariants: ['entity.core'],
            strictMode: false,
            ...config,
        };
        this.ajv = new ajv_1.default({ strict: false, allErrors: true });
        (0, ajv_formats_1.default)(this.ajv);
        // Combine built-in and custom invariants
        this.invariants = [
            ...BUILT_IN_INVARIANTS.filter((inv) => (this.config.builtInInvariants || []).includes(inv.id)),
            ...(this.config.customInvariants || []),
        ];
    }
    async validate(context) {
        if (context.type !== 'metadata_invariant') {
            return [];
        }
        const input = context.input;
        const results = [];
        // Get applicable invariants for this entity type
        const applicableInvariants = this.invariants.filter((inv) => inv.entityTypes.includes('*') ||
            inv.entityTypes.includes(input.entityType.toLowerCase()));
        // Apply invariant rules
        for (const invariant of applicableInvariants) {
            for (const rule of invariant.rules) {
                const ruleResult = this.applyRule(rule, input.metadata, invariant.id);
                results.push(ruleResult);
            }
        }
        // Apply input-specific rules
        if (input.rules) {
            for (const rule of input.rules) {
                const ruleResult = this.applyRule(rule, input.metadata, 'custom');
                results.push(ruleResult);
            }
        }
        // Check required fields
        if (input.requiredFields) {
            for (const field of input.requiredFields) {
                const value = this.getNestedValue(input.metadata, field);
                if (value === undefined || value === null) {
                    results.push((0, PolicyResult_js_1.fail)('pve.metadata.required_field', `Required field "${field}" is missing`, {
                        severity: 'error',
                        location: { field },
                    }));
                }
            }
        }
        // Strict mode: check for unknown fields
        if (this.config.strictMode) {
            results.push(...this.checkUnknownFields(input));
        }
        return results;
    }
    applyRule(rule, metadata, invariantId) {
        const value = this.getNestedValue(metadata, rule.field);
        const policyId = `pve.metadata.${invariantId}.${rule.field}.${rule.rule}`;
        switch (rule.rule) {
            case 'required':
                if (value === undefined || value === null) {
                    return (0, PolicyResult_js_1.fail)(policyId, `Field "${rule.field}" is required`, {
                        severity: 'error',
                        location: { field: rule.field },
                    });
                }
                return (0, PolicyResult_js_1.pass)(policyId);
            case 'type':
                return this.validateType(policyId, rule.field, value, rule.config);
            case 'pattern':
                return this.validatePattern(policyId, rule.field, value, rule.config);
            case 'enum':
                return this.validateEnum(policyId, rule.field, value, rule.config);
            case 'range':
                return this.validateRange(policyId, rule.field, value, rule.config);
            case 'custom':
                return this.validateCustom(policyId, rule.field, value, rule.config);
            default:
                return (0, PolicyResult_js_1.warn)(policyId, `Unknown rule type: ${rule.rule}`, {
                    location: { field: rule.field },
                });
        }
    }
    validateType(policyId, field, value, config) {
        if (value === undefined || value === null) {
            return (0, PolicyResult_js_1.pass)(policyId); // Type check only applies to present values
        }
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        const expectedType = config.type;
        if (actualType !== expectedType) {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" should be type "${expectedType}", got "${actualType}"`, {
                severity: 'error',
                location: { field },
                details: { expected: expectedType, actual: actualType },
            });
        }
        // Format validation
        if (config.format && typeof value === 'string') {
            const formatValid = this.validateFormat(value, config.format);
            if (!formatValid) {
                return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" does not match format "${config.format}"`, {
                    severity: 'warning',
                    location: { field },
                    details: { format: config.format, value },
                });
            }
        }
        return (0, PolicyResult_js_1.pass)(policyId);
    }
    validateFormat(value, format) {
        switch (format) {
            case 'date-time':
                return !isNaN(Date.parse(value));
            case 'date':
                return /^\d{4}-\d{2}-\d{2}$/.test(value);
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'uri':
                try {
                    new URL(value);
                    return true;
                }
                catch {
                    return false;
                }
            case 'uuid':
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
            default:
                return true;
        }
    }
    validatePattern(policyId, field, value, config) {
        if (value === undefined || value === null) {
            return (0, PolicyResult_js_1.pass)(policyId);
        }
        if (typeof value !== 'string') {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" must be a string for pattern validation`, {
                severity: 'error',
                location: { field },
            });
        }
        const regex = new RegExp(config.pattern, 'u');
        if (!regex.test(value)) {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" does not match required pattern`, {
                severity: 'warning',
                location: { field },
                details: { pattern: config.pattern, value },
            });
        }
        return (0, PolicyResult_js_1.pass)(policyId);
    }
    validateEnum(policyId, field, value, config) {
        if (value === undefined || value === null) {
            return (0, PolicyResult_js_1.pass)(policyId);
        }
        if (!config.values.includes(String(value))) {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" must be one of: ${config.values.join(', ')}`, {
                severity: 'warning',
                location: { field },
                details: { allowed: config.values, actual: value },
            });
        }
        return (0, PolicyResult_js_1.pass)(policyId);
    }
    validateRange(policyId, field, value, config) {
        if (value === undefined || value === null) {
            return (0, PolicyResult_js_1.pass)(policyId);
        }
        const num = Number(value);
        if (isNaN(num)) {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" must be a number for range validation`, {
                severity: 'error',
                location: { field },
            });
        }
        if (config.min !== undefined && num < config.min) {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" must be >= ${config.min}`, {
                severity: 'warning',
                location: { field },
                details: { minimum: config.min, actual: num },
            });
        }
        if (config.max !== undefined && num > config.max) {
            return (0, PolicyResult_js_1.fail)(policyId, `Field "${field}" must be <= ${config.max}`, {
                severity: 'warning',
                location: { field },
                details: { maximum: config.max, actual: num },
            });
        }
        return (0, PolicyResult_js_1.pass)(policyId);
    }
    validateCustom(policyId, field, _value, _config) {
        // Placeholder for custom validation logic
        return (0, PolicyResult_js_1.pass)(policyId, `Custom validation for "${field}" passed`);
    }
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }
            if (typeof current === 'object') {
                current = current[part];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    checkUnknownFields(input) {
        // Collect all known fields from invariants
        const knownFields = new Set();
        for (const invariant of this.invariants) {
            if (invariant.entityTypes.includes('*') ||
                invariant.entityTypes.includes(input.entityType.toLowerCase())) {
                for (const rule of invariant.rules) {
                    knownFields.add(rule.field.split('.')[0]);
                }
            }
        }
        // Check for unknown top-level fields
        const results = [];
        for (const field of Object.keys(input.metadata)) {
            if (!knownFields.has(field)) {
                results.push((0, PolicyResult_js_1.warn)('pve.metadata.unknown_field', `Unknown field "${field}" in metadata`, {
                    location: { field },
                }));
            }
        }
        return results;
    }
}
exports.MetadataInvariantValidator = MetadataInvariantValidator;
