"use strict";
/**
 * Base Matcher Interface
 *
 * Defines the contract for all matchers (deterministic and probabilistic).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMatcher = void 0;
exports.normalizeString = normalizeString;
exports.extractValue = extractValue;
exports.valuesEqual = valuesEqual;
class BaseMatcher {
    config;
    constructor(config) {
        this.config = config;
    }
    get name() {
        return this.config.name;
    }
    get version() {
        return this.config.version;
    }
    get isDeterministic() {
        return this.config.isDeterministic;
    }
    get supportedFeatures() {
        return this.config.featureTypes;
    }
    supportsEntityType(entityType) {
        return this.config.supportedEntityTypes.includes(entityType);
    }
    createEvidence(result) {
        return {
            featureType: result.featureType,
            valueA: result.valueA,
            valueB: result.valueB,
            similarity: result.similarity,
            weight: result.weight,
            matcherUsed: this.name,
            isDeterministic: this.isDeterministic,
            explanation: result.explanation,
            metadata: result.metadata,
        };
    }
}
exports.BaseMatcher = BaseMatcher;
/**
 * Normalize a string for comparison
 */
function normalizeString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
/**
 * Extract a value from nested object path
 */
function extractValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current === 'object' && current !== null) {
            current = current[part];
        }
        else {
            return undefined;
        }
    }
    return current;
}
/**
 * Check if two values are equal (case-insensitive for strings)
 */
function valuesEqual(a, b) {
    if (a === b)
        return true;
    if (typeof a === 'string' && typeof b === 'string') {
        return normalizeString(a) === normalizeString(b);
    }
    return false;
}
