"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAnonymizer = void 0;
exports.getDataAnonymizer = getDataAnonymizer;
const crypto_1 = require("crypto");
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('DataAnonymizer');
/**
 * DataAnonymizer provides field-level data anonymization
 * with multiple techniques for privacy protection.
 */
class DataAnonymizer {
    pseudonymMaps = new Map();
    hashSalt;
    constructor(hashSalt) {
        this.hashSalt = hashSalt || this.generateSalt();
    }
    /**
     * Anonymize a dataset according to field configurations
     */
    async anonymize(data, configs) {
        const stats = [];
        const warnings = [];
        const anonymizedData = [];
        for (const config of configs) {
            stats.push({
                fieldPath: config.fieldPath,
                technique: config.technique,
                recordsProcessed: 0,
                valuesAnonymized: 0,
                uniqueValuesBefore: 0,
                uniqueValuesAfter: 0,
            });
        }
        for (const record of data) {
            const anonymizedRecord = { ...record };
            for (let i = 0; i < configs.length; i++) {
                const config = configs[i];
                const stat = stats[i];
                try {
                    const originalValue = this.getNestedValue(record, config.fieldPath);
                    stat.recordsProcessed++;
                    if (originalValue !== undefined && originalValue !== null) {
                        const anonymizedValue = this.anonymizeValue(originalValue, config);
                        this.setNestedValue(anonymizedRecord, config.fieldPath, anonymizedValue);
                        stat.valuesAnonymized++;
                    }
                }
                catch (error) {
                    const message = `Failed to anonymize field ${config.fieldPath}: ${error}`;
                    warnings.push(message);
                    logger.warn(message);
                }
            }
            anonymizedData.push(anonymizedRecord);
        }
        // Calculate unique value stats
        for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            const stat = stats[i];
            const originalValues = new Set(data.map(r => JSON.stringify(this.getNestedValue(r, config.fieldPath))));
            const anonymizedValues = new Set(anonymizedData.map(r => JSON.stringify(this.getNestedValue(r, config.fieldPath))));
            stat.uniqueValuesBefore = originalValues.size;
            stat.uniqueValuesAfter = anonymizedValues.size;
        }
        logger.info('Anonymization complete', {
            records: data.length,
            fields: configs.length,
            warnings: warnings.length,
        });
        return {
            data: anonymizedData,
            stats,
            warnings,
        };
    }
    /**
     * Anonymize a single value according to technique
     */
    anonymizeValue(value, config) {
        if (value === null || value === undefined) {
            return value;
        }
        switch (config.technique) {
            case index_js_1.AnonymizationTechnique.REDACTION:
                return this.redact(value, config.config);
            case index_js_1.AnonymizationTechnique.HASHING:
                return this.hash(value, config.config);
            case index_js_1.AnonymizationTechnique.PSEUDONYMIZATION:
                return this.pseudonymize(value, config.fieldPath, config.config);
            case index_js_1.AnonymizationTechnique.GENERALIZATION:
                return this.generalize(value, config.config);
            case index_js_1.AnonymizationTechnique.MASKING:
                return this.mask(value, config.config);
            case index_js_1.AnonymizationTechnique.NOISE_ADDITION:
                return this.addNoise(value, config.config);
            case index_js_1.AnonymizationTechnique.K_ANONYMITY:
                return this.applyKAnonymity(value, config.config);
            case index_js_1.AnonymizationTechnique.DIFFERENTIAL_PRIVACY:
                return this.applyDifferentialPrivacy(value, config.config);
            default:
                logger.warn(`Unknown anonymization technique: ${config.technique}`);
                return value;
        }
    }
    /**
     * Redact value completely
     */
    redact(value, config) {
        const strValue = String(value);
        if (config.preserveLength) {
            return config.maskChar.repeat(strValue.length);
        }
        return '[REDACTED]';
    }
    /**
     * Hash value with salt
     */
    hash(value, config) {
        const algorithm = config.hashAlgorithm || 'sha256';
        const strValue = String(value);
        const hash = (0, crypto_1.createHash)(algorithm)
            .update(this.hashSalt + strValue)
            .digest('hex');
        return hash;
    }
    /**
     * Pseudonymize value with consistent mapping
     */
    pseudonymize(value, fieldPath, config) {
        const strValue = String(value);
        // Get or create map for this field
        if (!this.pseudonymMaps.has(fieldPath)) {
            this.pseudonymMaps.set(fieldPath, new Map());
        }
        const fieldMap = this.pseudonymMaps.get(fieldPath);
        // Return existing pseudonym or create new one
        if (fieldMap.has(strValue)) {
            return fieldMap.get(strValue);
        }
        // Generate pseudonym
        const pseudonym = this.generatePseudonym(strValue, config);
        fieldMap.set(strValue, pseudonym);
        return pseudonym;
    }
    /**
     * Generalize value to less specific form
     */
    generalize(value, config) {
        if (typeof value === 'number') {
            // Round to nearest 10, 100, etc based on magnitude
            const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(value))));
            return Math.round(value / magnitude) * magnitude;
        }
        if (typeof value === 'string') {
            // For strings, keep first few characters
            const keepLength = Math.min(3, Math.floor(value.length / 2));
            return value.substring(0, keepLength) + '...';
        }
        if (value instanceof Date) {
            // Generalize to month/year
            return new Date(value.getFullYear(), value.getMonth(), 1);
        }
        return value;
    }
    /**
     * Mask value with partial hiding
     */
    mask(value, config) {
        const strValue = String(value);
        const maskChar = config.maskChar || '*';
        const fromStart = config.maskFromStart || 0;
        const fromEnd = config.maskFromEnd || 0;
        if (strValue.length <= fromStart + fromEnd) {
            return maskChar.repeat(strValue.length);
        }
        const masked = strValue.substring(0, fromStart) +
            maskChar.repeat(strValue.length - fromStart - fromEnd) +
            strValue.substring(strValue.length - fromEnd);
        return masked;
    }
    /**
     * Add statistical noise to numeric values
     */
    addNoise(value, config) {
        if (typeof value !== 'number') {
            return value;
        }
        // Add Laplacian noise scaled by value magnitude
        const scale = Math.abs(value) * 0.1; // 10% scale factor
        const noise = this.laplacianNoise(scale);
        return value + noise;
    }
    /**
     * Apply k-anonymity generalization
     */
    applyKAnonymity(value, config) {
        const k = config.kValue || 5;
        if (typeof value === 'number') {
            // Create ranges that group at least k values
            const range = Math.ceil(Math.abs(value) / k) * k;
            const lower = Math.floor(value / range) * range;
            return `${lower}-${lower + range}`;
        }
        if (typeof value === 'string' && value.length > 0) {
            // Generalize to first character + length range
            const lengthRange = Math.ceil(value.length / k) * k;
            return `${value[0]}*** (${lengthRange - k + 1}-${lengthRange} chars)`;
        }
        return this.generalize(value, config);
    }
    /**
     * Apply differential privacy noise
     */
    applyDifferentialPrivacy(value, config) {
        if (typeof value !== 'number') {
            return this.hash(value, config);
        }
        const epsilon = config.epsilon || 1.0;
        const sensitivity = 1; // Assume unit sensitivity
        const scale = sensitivity / epsilon;
        const noise = this.laplacianNoise(scale);
        return value + noise;
    }
    // Helper methods
    generateSalt() {
        return (0, crypto_1.createHash)('sha256')
            .update(Date.now().toString() + Math.random().toString())
            .digest('hex')
            .substring(0, 16);
    }
    generatePseudonym(original, config) {
        // Generate consistent but anonymous pseudonym
        const hash = (0, crypto_1.createHash)('sha256')
            .update(this.hashSalt + original)
            .digest('hex');
        if (config.preserveFormat) {
            // Try to preserve format (e.g., email, phone)
            if (original.includes('@')) {
                return `user_${hash.substring(0, 8)}@example.com`;
            }
            if (/^\d{3}-\d{3}-\d{4}$/.test(original)) {
                return `555-${hash.substring(0, 3)}-${hash.substring(3, 7)}`;
            }
        }
        if (config.preserveLength) {
            return hash.substring(0, original.length);
        }
        return `PSEUDO_${hash.substring(0, 12)}`;
    }
    laplacianNoise(scale) {
        // Generate Laplacian noise using inverse CDF
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }
    /**
     * Reset pseudonym mappings (for new dataset)
     */
    resetMappings() {
        this.pseudonymMaps.clear();
    }
    /**
     * Get pseudonym mapping for a field (for audit purposes)
     */
    getPseudonymMapping(fieldPath) {
        return this.pseudonymMaps.get(fieldPath);
    }
}
exports.DataAnonymizer = DataAnonymizer;
/**
 * Singleton instance
 */
let anonymizerInstance = null;
function getDataAnonymizer(salt) {
    if (!anonymizerInstance) {
        anonymizerInstance = new DataAnonymizer(salt);
    }
    return anonymizerInstance;
}
