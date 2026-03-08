"use strict";
/**
 * Redaction Middleware for GraphQL and REST APIs
 *
 * Provides policy-based redaction of sensitive data based on user clearance,
 * sensitivity classification, and context (purpose, step-up auth, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionMiddleware = exports.RedactionStrategy = void 0;
exports.createGraphQLRedactionMiddleware = createGraphQLRedactionMiddleware;
exports.createRESTRedactionMiddleware = createRESTRedactionMiddleware;
const sensitivity_js_1 = require("./sensitivity.js");
// Added for Privacy Engine visibility
const recognizer_js_1 = require("./recognizer.js");
/**
 * Redaction strategy
 */
var RedactionStrategy;
(function (RedactionStrategy) {
    /** No redaction */
    RedactionStrategy["NONE"] = "NONE";
    /** Full redaction: [REDACTED] */
    RedactionStrategy["FULL"] = "FULL";
    /** Partial masking: show last N characters */
    RedactionStrategy["PARTIAL"] = "PARTIAL";
    /** Hash the value */
    RedactionStrategy["HASH"] = "HASH";
    /** Nullify the field */
    RedactionStrategy["NULL"] = "NULL";
    /** Remove the field entirely */
    RedactionStrategy["REMOVE"] = "REMOVE";
})(RedactionStrategy || (exports.RedactionStrategy = RedactionStrategy = {}));
/**
 * Redaction middleware
 */
class RedactionMiddleware {
    sensitivityClassifier;
    recognizer;
    constructor() {
        this.sensitivityClassifier = new sensitivity_js_1.SensitivityClassifier();
        this.recognizer = new recognizer_js_1.HybridEntityRecognizer();
    }
    /**
     * Redact data based on user context and sensitivity
     */
    async redact(data, userContext, options) {
        const redactedFields = [];
        const dlpRules = [];
        // Check if user has required step-up authentication
        const requiresStepUp = this.checkStepUpRequirement(userContext);
        if (requiresStepUp && !userContext.stepUpToken) {
            return {
                data: null,
                redactedFields: [],
                redactedCount: 0,
                accessDenied: true,
                denialReason: 'Step-up authentication required',
                auditEntry: {
                    userId: userContext.userId,
                    action: 'ACCESS_DENIED',
                    timestamp: new Date(),
                    fieldsRedacted: [],
                    dlpRules: ['require-step-up'],
                    purpose: userContext.purpose,
                },
            };
        }
        // Check if purpose is required and provided
        const requiresPurpose = this.checkPurposeRequirement(userContext);
        if (requiresPurpose && !userContext.purpose) {
            return {
                data: null,
                redactedFields: [],
                redactedCount: 0,
                accessDenied: true,
                denialReason: 'Purpose justification required',
                auditEntry: {
                    userId: userContext.userId,
                    action: 'ACCESS_DENIED',
                    timestamp: new Date(),
                    fieldsRedacted: [],
                    dlpRules: ['require-purpose'],
                    purpose: userContext.purpose,
                },
            };
        }
        // Deep clone data
        let redactedData = JSON.parse(JSON.stringify(data));
        // Recursively redact fields
        const processValue = async (obj, path = []) => {
            if (obj === null || obj === undefined) {
                return;
            }
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    await processValue(obj[i], [...path, String(i)]);
                }
                return;
            }
            if (typeof obj !== 'object') {
                return;
            }
            for (const key of Object.keys(obj)) {
                const currentPath = [...path, key];
                const value = obj[key];
                // Check if this field contains PII
                if (value && typeof value === 'string') {
                    const decision = await this.evaluateFieldAccess(value, currentPath, userContext);
                    if (!decision.allow && decision.redaction) {
                        const redacted = this.applyRedaction(value, decision.redaction);
                        obj[key] = redacted;
                        redactedFields.push(currentPath.join('.'));
                        dlpRules.push(decision.reason);
                    }
                }
                // Recurse into nested objects/arrays
                if (typeof value === 'object') {
                    await processValue(value, currentPath);
                }
            }
        };
        await processValue(redactedData);
        return {
            data: redactedData,
            redactedFields,
            redactedCount: redactedFields.length,
            accessDenied: false,
            auditEntry: {
                userId: userContext.userId,
                action: 'DATA_ACCESS',
                timestamp: new Date(),
                fieldsRedacted: redactedFields,
                dlpRules,
                purpose: userContext.purpose,
            },
        };
    }
    /**
     * Evaluate access to a specific field
     */
    async evaluateFieldAccess(value, path, userContext) {
        if (!this.recognizer) {
            return { allow: true, reason: 'No PII detector configured' };
        }
        // Detect PII in the field value
        const result = await this.recognizer.recognize({
            value,
            schemaField: { fieldName: path[path.length - 1] },
        });
        if (result.entities.length === 0) {
            // No PII detected, allow access
            return { allow: true, reason: 'No PII detected' };
        }
        // Get the highest severity entity
        const severities = ['low', 'medium', 'high', 'critical'];
        const maxEntity = result.entities.reduce((max, entity) => {
            const entitySeverity = this.getPIISeverity(entity.type);
            const maxSeverityIndex = severities.indexOf(this.getPIISeverity(max.type));
            const currentSeverityIndex = severities.indexOf(entitySeverity);
            return currentSeverityIndex > maxSeverityIndex ? entity : max;
        });
        const severity = this.getPIISeverity(maxEntity.type);
        const piiType = maxEntity.type;
        // Apply role-based redaction policy
        const policy = this.getPolicyForRole(userContext.role, piiType, severity);
        // Check clearance level
        const requiredClearance = this.getRequiredClearance(severity);
        if (userContext.clearance < requiredClearance) {
            return {
                allow: false,
                redaction: {
                    strategy: RedactionStrategy.FULL,
                    reason: `Insufficient clearance (required: ${requiredClearance}, have: ${userContext.clearance})`,
                },
                reason: 'insufficient-clearance',
            };
        }
        // Return the policy decision
        return policy;
    }
    /**
     * Get redaction policy for role + PII type + severity
     */
    getPolicyForRole(role, piiType, severity) {
        // ADMIN: No redaction
        if (role === 'ADMIN') {
            return { allow: true, reason: 'admin-access' };
        }
        // ANALYST: Partial redaction for high-severity
        if (role === 'ANALYST') {
            if (severity === 'critical') {
                return {
                    allow: false,
                    redaction: {
                        strategy: RedactionStrategy.FULL,
                        reason: 'Critical PII - ANALYST cannot access',
                    },
                    reason: 'critical-pii-blocked',
                };
            }
            if (severity === 'high') {
                return {
                    allow: false,
                    redaction: {
                        strategy: RedactionStrategy.PARTIAL,
                        showLast: 4,
                        maskPattern: '***',
                        reason: 'High-severity PII - partial redaction',
                    },
                    reason: 'high-severity-partial',
                };
            }
            return { allow: true, reason: 'analyst-access' };
        }
        // VIEWER: Heavy redaction
        if (role === 'VIEWER') {
            if (severity === 'critical' || severity === 'high') {
                return {
                    allow: false,
                    redaction: {
                        strategy: RedactionStrategy.FULL,
                        reason: 'High-severity PII - VIEWER cannot access',
                    },
                    reason: 'high-severity-blocked',
                };
            }
            if (severity === 'medium') {
                return {
                    allow: false,
                    redaction: {
                        strategy: RedactionStrategy.PARTIAL,
                        showLast: 2,
                        maskPattern: '***',
                        reason: 'Medium-severity PII - partial redaction',
                    },
                    reason: 'medium-severity-partial',
                };
            }
            return { allow: true, reason: 'viewer-low-severity' };
        }
        // Default: deny access
        return {
            allow: false,
            redaction: {
                strategy: RedactionStrategy.FULL,
                reason: 'Unknown role - default deny',
            },
            reason: 'unknown-role',
        };
    }
    /**
     * Apply redaction strategy to value
     */
    applyRedaction(value, options) {
        switch (options.strategy) {
            case RedactionStrategy.NONE:
                return value;
            case RedactionStrategy.FULL:
                return '[REDACTED]';
            case RedactionStrategy.PARTIAL:
                const showLast = options.showLast || 4;
                const maskPattern = options.maskPattern || '***';
                if (value.length <= showLast) {
                    return maskPattern;
                }
                return maskPattern + value.slice(-showLast);
            case RedactionStrategy.HASH:
                // Simple hash (in production, use crypto)
                return `[HASH:${Buffer.from(value).toString('base64').slice(0, 16)}]`;
            case RedactionStrategy.NULL:
                return null;
            case RedactionStrategy.REMOVE:
                return undefined;
            default:
                return '[REDACTED]';
        }
    }
    /**
     * Get PII severity for a type (simplified - should use taxonomy)
     */
    getPIISeverity(piiType) {
        const criticalTypes = [
            'socialSecurityNumber',
            'creditCardNumber',
            'passportNumber',
            'healthRecordNumber',
            'biometricFingerprint',
            'biometricFace',
            'biometricDNA',
        ];
        const highTypes = [
            'email',
            'phoneNumber',
            'driverLicenseNumber',
            'bankAccountNumber',
            'password',
        ];
        const mediumTypes = [
            'fullName',
            'dateOfBirth',
            'homeAddress',
            'ipAddress',
        ];
        if (criticalTypes.includes(piiType))
            return 'critical';
        if (highTypes.includes(piiType))
            return 'high';
        if (mediumTypes.includes(piiType))
            return 'medium';
        return 'low';
    }
    /**
     * Get required clearance for severity level
     */
    getRequiredClearance(severity) {
        switch (severity) {
            case 'critical': return 5;
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 0;
        }
    }
    /**
     * Check if step-up authentication is required
     */
    checkStepUpRequirement(userContext) {
        // Step-up required for high clearance data or sensitive purposes
        return userContext.clearance >= 3 ||
            userContext.purpose === 'export' ||
            userContext.purpose === 'legal';
    }
    /**
     * Check if purpose is required
     */
    checkPurposeRequirement(userContext) {
        // Purpose required for non-ADMIN roles
        return userContext.role !== 'ADMIN' && userContext.clearance >= 2;
    }
}
exports.RedactionMiddleware = RedactionMiddleware;
/**
 * GraphQL middleware factory
 *
 * Wraps GraphQL resolvers to apply redaction
 */
function createGraphQLRedactionMiddleware(middleware) {
    return (next) => async (root, args, context, info) => {
        // Call original resolver
        const result = await next(root, args, context, info);
        // Extract user context from GraphQL context
        const userContext = {
            userId: context.user?.id || 'anonymous',
            role: context.user?.role || 'VIEWER',
            clearance: context.user?.clearance || 0,
            purpose: context.purpose,
            stepUpToken: context.stepUpToken,
            approvalToken: context.approvalToken,
        };
        // Apply redaction
        const redacted = await middleware.redact(result, userContext);
        if (redacted.accessDenied) {
            throw new Error(`Access denied: ${redacted.denialReason}`);
        }
        // TODO: Log audit entry to hash chain
        // await auditHashChain.appendEvent(redacted.auditEntry);
        return redacted.data;
    };
}
/**
 * REST API middleware for Express
 */
function createRESTRedactionMiddleware(middleware) {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json method to apply redaction
        res.json = async (data) => {
            const userContext = {
                userId: req.user?.id || 'anonymous',
                role: req.user?.role || 'VIEWER',
                clearance: req.user?.clearance || 0,
                purpose: req.headers['x-purpose'],
                stepUpToken: req.headers['x-step-up-token'],
                approvalToken: req.headers['x-approval-token'],
            };
            const redacted = await middleware.redact(data, userContext);
            if (redacted.accessDenied) {
                return res.status(403).json({
                    error: 'Access denied',
                    reason: redacted.denialReason,
                });
            }
            // Add redaction metadata to response headers
            res.setHeader('X-Fields-Redacted', redacted.redactedCount);
            res.setHeader('X-DLP-Rules', redacted.auditEntry.dlpRules.join(','));
            return originalJson(redacted.data);
        };
        next();
    };
}
