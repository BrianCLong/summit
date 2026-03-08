"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionEngine = void 0;
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
/**
 * Redaction Engine
 *
 * Performs field-level redaction, anonymization, and pseudonymization
 * operations on data according to redaction rules.
 */
class RedactionEngine {
    logger = pino_1.default({ name: 'redaction-engine' });
    pool;
    cypherRunner;
    assertSafeIdentifier(identifier, context) {
        const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
        if (!identifierPattern.test(identifier)) {
            throw new Error(`Invalid identifier provided for ${context}`);
        }
        return identifier;
    }
    // Pseudonym mapping for consistent pseudonymization
    pseudonymCache = new Map();
    constructor(options) {
        this.pool = options.pool;
        this.cypherRunner = options.runCypher;
    }
    /**
     * Redact a record according to rules
     */
    async redactRecord(record, rules, options) {
        const result = {
            recordId: options.recordId,
            storageSystem: options.storageSystem,
            fields: [],
            hashStubs: new Map(),
        };
        // Apply only rules that target the current storage system
        const applicableRules = rules.filter((rule) => rule.storageTargets.includes(options.storageSystem));
        // Sort rules by specificity (more specific patterns first)
        const sortedRules = this.sortRulesBySpecificity(applicableRules);
        // Apply rules to each field
        for (const [fieldName, value] of Object.entries(record)) {
            // Find matching rule
            const matchingRule = sortedRules.find((rule) => this.fieldMatchesRule(fieldName, value, rule));
            if (matchingRule) {
                const redactionResult = await this.redactField(fieldName, value, matchingRule, options.preserveProvenance);
                result.fields.push(redactionResult);
                // Update record with redacted value
                record[fieldName] = redactionResult.redactedValue;
                // Store hash stub if created
                if (redactionResult.hashStub) {
                    result.hashStubs.set(fieldName, redactionResult.hashStub);
                }
            }
        }
        return result;
    }
    /**
     * Redact a single field
     */
    async redactField(fieldName, value, rule, preserveProvenance) {
        const operation = rule.operation;
        const params = rule.parameters ?? {};
        let redactedValue;
        let hashStub;
        // Create hash stub if requested
        if (preserveProvenance && rule.keepHashStub) {
            hashStub = this.createHashStub(fieldName, value);
        }
        switch (operation) {
            case 'mask':
                redactedValue = this.maskValue(value, params);
                break;
            case 'hash':
                redactedValue = this.hashValue(value, params);
                break;
            case 'delete':
                redactedValue = null;
                break;
            case 'anonymize':
                redactedValue = this.anonymizeValue(value, fieldName);
                break;
            case 'pseudonymize':
                redactedValue = this.pseudonymizeValue(value, fieldName);
                break;
            case 'truncate':
                redactedValue = this.truncateValue(value, params);
                break;
            case 'generalize':
                redactedValue = this.generalizeValue(value, fieldName);
                break;
            default:
                this.logger.warn({ operation, fieldName }, 'Unknown redaction operation');
                redactedValue = value;
        }
        return {
            fieldName,
            operation,
            originalValue: preserveProvenance ? value : undefined,
            redactedValue,
            hashStub,
        };
    }
    /**
     * Mask a value with asterisks or custom character
     */
    maskValue(value, params) {
        if (value == null) {
            return '';
        }
        const str = String(value);
        const maskChar = params.maskChar ?? '*';
        if (params.preserveFormat) {
            // Preserve format (e.g., phone: xxx-xxx-1234)
            return str.replace(/[a-zA-Z0-9]/g, maskChar);
        }
        if (params.preserveLength) {
            return maskChar.repeat(str.length);
        }
        return maskChar.repeat(8);
    }
    /**
     * Hash a value
     */
    hashValue(value, params) {
        if (value == null) {
            return '';
        }
        const algorithm = params.hashAlgorithm ?? 'sha256';
        return crypto_1.default.createHash(algorithm).update(String(value)).digest('hex');
    }
    /**
     * Anonymize a value (non-reversible, non-consistent)
     */
    anonymizeValue(value, fieldName) {
        if (value == null) {
            return null;
        }
        // Different strategies based on field name
        if (this.isEmailField(fieldName)) {
            return `anonymous-${crypto_1.default.randomBytes(8).toString('hex')}@example.com`;
        }
        if (this.isPhoneField(fieldName)) {
            return `555-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
        }
        if (this.isNameField(fieldName)) {
            return 'Anonymous User';
        }
        if (this.isAddressField(fieldName)) {
            return 'Redacted Address';
        }
        if (typeof value === 'number') {
            return 0;
        }
        if (typeof value === 'string') {
            return '[REDACTED]';
        }
        return null;
    }
    /**
     * Pseudonymize a value (reversible with key, consistent)
     */
    pseudonymizeValue(value, fieldName) {
        if (value == null) {
            return null;
        }
        const key = `${fieldName}:${value}`;
        // Check cache for consistent pseudonyms
        if (this.pseudonymCache.has(key)) {
            return this.pseudonymCache.get(key);
        }
        let pseudonym;
        if (this.isEmailField(fieldName)) {
            const hash = crypto_1.default
                .createHash('sha256')
                .update(String(value))
                .digest('hex')
                .substring(0, 16);
            pseudonym = `user-${hash}@example.com`;
        }
        else if (this.isPhoneField(fieldName)) {
            const hash = crypto_1.default
                .createHash('sha256')
                .update(String(value))
                .digest('hex')
                .substring(0, 8);
            const num = parseInt(hash, 16);
            pseudonym = `555-${String(num).substring(0, 3)}-${String(num).substring(3, 7)}`;
        }
        else {
            const hash = crypto_1.default
                .createHash('sha256')
                .update(String(value))
                .digest('hex')
                .substring(0, 16);
            pseudonym = `pseudo-${hash}`;
        }
        this.pseudonymCache.set(key, pseudonym);
        return pseudonym;
    }
    /**
     * Truncate a value to safe length
     */
    truncateValue(value, params) {
        if (value == null) {
            return '';
        }
        const str = String(value);
        const maxLength = params.maxLength ?? 50;
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + '...';
    }
    /**
     * Generalize a value to broader category
     */
    generalizeValue(value, fieldName) {
        if (value == null) {
            return null;
        }
        // Age ranges
        if (fieldName.toLowerCase().includes('age') &&
            typeof value === 'number') {
            if (value < 18)
                return '0-17';
            if (value < 30)
                return '18-29';
            if (value < 50)
                return '30-49';
            if (value < 70)
                return '50-69';
            return '70+';
        }
        // Date to year
        if ((fieldName.toLowerCase().includes('date') ||
            fieldName.toLowerCase().includes('birth')) &&
            value instanceof Date) {
            return value.getFullYear();
        }
        // Location to region/state
        if (this.isAddressField(fieldName)) {
            return 'United States'; // Generalize to country level
        }
        // Default: return as-is
        return value;
    }
    /**
     * Create a hash stub for provenance tracking
     */
    createHashStub(fieldName, value) {
        const content = JSON.stringify({ field: fieldName, value });
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Check if field matches rule
     */
    fieldMatchesRule(fieldName, value, rule) {
        // Match field name pattern
        const pattern = rule.fieldPattern;
        if (!this.matchPattern(fieldName, pattern)) {
            return false;
        }
        // Check conditions
        if (rule.conditions) {
            // Value pattern matching
            if (rule.conditions.valuePattern) {
                const valueStr = String(value);
                const regex = new RegExp(rule.conditions.valuePattern);
                if (!regex.test(valueStr)) {
                    return false;
                }
            }
            // Field type matching
            if (rule.conditions.fieldType) {
                if (!this.matchesFieldType(fieldName, value, rule.conditions.fieldType)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Match field name against pattern
     */
    matchPattern(fieldName, pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(fieldName);
    }
    /**
     * Check if field matches type
     */
    matchesFieldType(fieldName, value, fieldType) {
        switch (fieldType) {
            case 'email':
                return this.isEmailField(fieldName) || this.isEmailValue(value);
            case 'phone':
                return this.isPhoneField(fieldName) || this.isPhoneValue(value);
            case 'ssn':
                return (fieldName.toLowerCase().includes('ssn') ||
                    fieldName.toLowerCase().includes('social_security'));
            case 'credit_card':
                return (fieldName.toLowerCase().includes('card') ||
                    fieldName.toLowerCase().includes('credit'));
            default:
                return false;
        }
    }
    /**
     * Field name heuristics
     */
    isEmailField(fieldName) {
        const lower = fieldName.toLowerCase();
        return lower.includes('email') || lower.includes('mail');
    }
    isPhoneField(fieldName) {
        const lower = fieldName.toLowerCase();
        return lower.includes('phone') || lower.includes('tel') || lower.includes('mobile');
    }
    isNameField(fieldName) {
        const lower = fieldName.toLowerCase();
        return (lower.includes('name') ||
            lower.includes('first') ||
            lower.includes('last') ||
            lower.includes('full'));
    }
    isAddressField(fieldName) {
        const lower = fieldName.toLowerCase();
        return (lower.includes('address') ||
            lower.includes('street') ||
            lower.includes('city') ||
            lower.includes('zip') ||
            lower.includes('postal'));
    }
    /**
     * Value pattern matching
     */
    isEmailValue(value) {
        if (typeof value !== 'string') {
            return false;
        }
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    isPhoneValue(value) {
        if (typeof value !== 'string') {
            return false;
        }
        return /^[\d\s\-\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 10;
    }
    /**
     * Sort rules by specificity
     */
    sortRulesBySpecificity(rules) {
        return rules.sort((a, b) => {
            // More specific patterns (less wildcards) come first
            const aWildcards = (a.fieldPattern.match(/\*/g) || []).length;
            const bWildcards = (b.fieldPattern.match(/\*/g) || []).length;
            if (aWildcards !== bWildcards) {
                return aWildcards - bWildcards;
            }
            // Longer patterns are more specific
            return b.fieldPattern.length - a.fieldPattern.length;
        });
    }
    /**
     * Bulk redact records in PostgreSQL
     */
    async redactPostgresRecords(table, recordIds, rules, options = {}) {
        const tableName = this.assertSafeIdentifier(table, 'postgres table');
        const idColumn = this.assertSafeIdentifier(options.idColumn ?? 'id', 'postgres identifier column');
        const results = [];
        // Fetch records
        const query = `SELECT * FROM ${tableName} WHERE ${idColumn} = ANY($1::text[])`;
        const result = await this.pool.query(query, [recordIds]);
        // Redact each record
        for (const row of result.rows) {
            const redactionResult = await this.redactRecord(row, rules, {
                recordId: row[idColumn],
                storageSystem: 'postgres',
                preserveProvenance: options.preserveProvenance,
            });
            // Build UPDATE query
            const setClause = redactionResult.fields
                .map((f, idx) => {
                const safeFieldName = this.assertSafeIdentifier(f.fieldName, 'postgres field name');
                return `${safeFieldName} = $${idx + 2}`;
            })
                .join(', ');
            const values = redactionResult.fields.map((f) => f.redactedValue);
            await this.pool.query(`UPDATE ${tableName} SET ${setClause} WHERE ${idColumn} = $1`, [row[idColumn], ...values]);
            results.push(redactionResult);
        }
        return results;
    }
    /**
     * Bulk redact nodes in Neo4j
     */
    async redactNeo4jNodes(label, nodeIds, rules, options = {}) {
        if (!this.cypherRunner) {
            throw new Error('Cypher runner not configured');
        }
        const idProperty = options.idProperty ?? 'id';
        const results = [];
        // Fetch nodes
        const cypher = `
      MATCH (n:${label})
      WHERE n.${idProperty} IN $nodeIds
      RETURN n
    `;
        const result = await this.cypherRunner(cypher, { nodeIds });
        // Redact each node
        for (const record of result) {
            const node = record.n.properties;
            const nodeId = node[idProperty];
            const redactionResult = await this.redactRecord(node, rules, {
                recordId: nodeId,
                storageSystem: 'neo4j',
                preserveProvenance: options.preserveProvenance,
            });
            // Build SET clause for Cypher
            const setClauses = redactionResult.fields
                .map((f) => `n.${f.fieldName} = $${f.fieldName}`)
                .join(', ');
            const params = { nodeId };
            for (const field of redactionResult.fields) {
                params[field.fieldName] = field.redactedValue;
            }
            await this.cypherRunner(`MATCH (n:${label}) WHERE n.${idProperty} = $nodeId SET ${setClauses}`, params);
            results.push(redactionResult);
        }
        return results;
    }
}
exports.RedactionEngine = RedactionEngine;
