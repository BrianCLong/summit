"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactData = redactData;
// @ts-ignore
const pino_1 = __importDefault(require("pino"));
const crypto_1 = require("crypto");
// @ts-ignore
const logger = pino_1.default();
// Define PII types and their associated properties/paths
// This should ideally be driven by a central schema or configuration
const PII_DEFINITIONS = {
    EMAIL: ['email', 'properties.email'],
    PHONE: ['phone', 'properties.phone'],
    SSN: ['ssn', 'properties.ssn'],
    CREDIT_CARD: ['creditCard', 'properties.creditCard'],
    NAME: ['name', 'label', 'properties.name'],
    ADDRESS: ['address', 'properties.address'],
    IP_ADDRESS: ['ipAddress', 'properties.ipAddress'],
    DATE_OF_BIRTH: ['dob', 'properties.dob'],
    // Add more as needed
};
// Pre-compute path to PII type mapping for O(1) lookup
const PATH_TO_PII_TYPE = {};
Object.keys(PII_DEFINITIONS).forEach((type) => {
    PII_DEFINITIONS[type].forEach((path) => {
        PATH_TO_PII_TYPE[path] = type;
    });
});
// Define redaction strategies
var RedactionStrategy;
(function (RedactionStrategy) {
    RedactionStrategy["REDACT"] = "[REDACTED]";
    RedactionStrategy["MASK_PARTIAL"] = "MASK_PARTIAL";
    RedactionStrategy["HASH"] = "HASH";
    RedactionStrategy["NULL"] = "NULL";
})(RedactionStrategy || (RedactionStrategy = {}));
// Define roles and their associated redaction policies
// This is a simplified example; a real system would have more granular policies
const REDACTION_POLICIES_BY_ROLE = {
    ADMIN: {
    // Admins see everything, no redaction by default
    },
    ANALYST: {
        EMAIL: RedactionStrategy.MASK_PARTIAL,
        PHONE: RedactionStrategy.MASK_PARTIAL,
        SSN: RedactionStrategy.REDACT,
        CREDIT_CARD: RedactionStrategy.REDACT,
        // Other PII types might not be redacted for analysts
    },
    VIEWER: {
        EMAIL: RedactionStrategy.REDACT,
        PHONE: RedactionStrategy.REDACT,
        SSN: RedactionStrategy.REDACT,
        CREDIT_CARD: RedactionStrategy.REDACT,
        NAME: RedactionStrategy.MASK_PARTIAL,
        ADDRESS: RedactionStrategy.REDACT,
        IP_ADDRESS: RedactionStrategy.REDACT,
        DATE_OF_BIRTH: RedactionStrategy.REDACT,
    },
};
/**
 * Redacts PII from data based on user role and defined policies.
 * @param data The data object to redact.
 * @param user The user performing the export.
 * @param sensitivity Optional sensitivity level for the data (e.g., 'high', 'medium').
 * @returns The redacted data object.
 */
function redactData(data, user, sensitivity) {
    if (!data)
        return data;
    const userRole = user.role || 'VIEWER'; // Default to VIEWER if no role
    const policy = REDACTION_POLICIES_BY_ROLE[userRole.toUpperCase()] || {};
    // Deep clone data to avoid modifying original object
    // Using structuredClone is faster than JSON.parse(JSON.stringify) and supports more types
    let redactedData;
    try {
        redactedData = structuredClone(data);
    }
    catch (e) {
        // Fallback if data is not clonable (e.g. contains functions), though unusual for data objects
        redactedData = JSON.parse(JSON.stringify(data));
    }
    let piiRedactedCount = 0;
    // const piiFieldsRedacted: string[] = []; // optimize: commented out unused array
    const applyRedaction = (obj, prefix) => {
        if (typeof obj !== 'object' || obj === null)
            return;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // Optimize path construction: use string concatenation instead of array spread
                const fullPath = prefix ? `${prefix}.${key}` : key;
                // O(1) lookup instead of nested loops
                const piiType = PATH_TO_PII_TYPE[fullPath];
                if (piiType) {
                    const strategy = policy[piiType];
                    if (strategy) {
                        obj[key] = applyStrategy(obj[key], piiType, strategy);
                        piiRedactedCount++;
                        // piiFieldsRedacted.push(fullPath);
                        logger.debug(`Redacted PII field: ${fullPath} with strategy: ${strategy}`);
                    }
                }
                // Recursively apply redaction to nested objects/arrays
                if (typeof obj[key] === 'object') {
                    applyRedaction(obj[key], fullPath);
                }
            }
        }
    };
    applyRedaction(redactedData, '');
    logger.info(`Data redaction complete for user ${user.id} (role: ${userRole}). Redacted ${piiRedactedCount} PII fields.`);
    // You might want to audit this redaction event
    // auditService.logRedaction(user.id, userRole, piiFieldsRedacted, sensitivity);
    return redactedData;
}
function applyStrategy(value, piiType, strategy) {
    if (value === undefined || value === null)
        return value;
    switch (strategy) {
        case RedactionStrategy.REDACT:
            return RedactionStrategy.REDACT;
        case RedactionStrategy.MASK_PARTIAL:
            return maskPartial(String(value), piiType);
        case RedactionStrategy.HASH:
            return hashValue(String(value));
        case RedactionStrategy.NULL:
            return null;
        default:
            return value;
    }
}
function maskPartial(value, piiType) {
    switch (piiType) {
        case 'EMAIL':
            const atIndex = value.indexOf('@');
            if (atIndex > 0) {
                return `${value.substring(0, 3)}***${value.substring(atIndex)}`;
            }
            return '***';
        case 'PHONE':
            if (value.length > 4) {
                return `***-***-${value.substring(value.length - 4)}`;
            }
            return '***';
        case 'NAME':
            if (value.length > 2) {
                return `${value.substring(0, 1)}***${value.substring(value.length - 1)}`;
            }
            return '***';
        default:
            return '[MASKED]';
    }
}
function hashValue(value) {
    // In a real application, use a strong, secure hashing algorithm
    // For demonstration, a simple SHA-256 like hash
    return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
}
