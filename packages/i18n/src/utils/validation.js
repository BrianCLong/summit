"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenMessages = flattenMessages;
exports.extractInterpolations = extractInterpolations;
exports.validateTranslations = validateTranslations;
exports.calculateTranslationStats = calculateTranslationStats;
exports.findDuplicateTranslations = findDuplicateTranslations;
exports.findUntranslatedStrings = findUntranslatedStrings;
exports.validateICUFormat = validateICUFormat;
exports.generateCoverageReport = generateCoverageReport;
/**
 * Flatten nested messages object to dot-notation keys
 */
function flattenMessages(messages, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(messages)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
            result[fullKey] = value;
        }
        else if (typeof value === 'object' && value !== null) {
            Object.assign(result, flattenMessages(value, fullKey));
        }
    }
    return result;
}
/**
 * Extract interpolation variables from a translation string
 */
function extractInterpolations(text) {
    const matches = text.match(/\{(\w+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
}
/**
 * Validate translation completeness and correctness
 */
function validateTranslations(baseLocale, targetLocale, baseMessages, targetMessages) {
    const baseFlat = flattenMessages(baseMessages);
    const targetFlat = flattenMessages(targetMessages);
    const baseKeys = new Set(Object.keys(baseFlat));
    const targetKeys = new Set(Object.keys(targetFlat));
    // Find missing keys (in base but not in target)
    const missingKeys = Array.from(baseKeys).filter((key) => !targetKeys.has(key));
    // Find extra keys (in target but not in base)
    const extraKeys = Array.from(targetKeys).filter((key) => !baseKeys.has(key));
    // Find empty values
    const emptyValues = Object.entries(targetFlat)
        .filter(([_, value]) => !value || value.trim() === '')
        .map(([key]) => key);
    // Find invalid interpolations (mismatched variables)
    const invalidInterpolations = [];
    for (const key of baseKeys) {
        if (targetFlat[key]) {
            const baseVars = new Set(extractInterpolations(baseFlat[key]));
            const targetVars = new Set(extractInterpolations(targetFlat[key]));
            const missingVars = Array.from(baseVars).filter((v) => !targetVars.has(v));
            const extraVars = Array.from(targetVars).filter((v) => !baseVars.has(v));
            if (missingVars.length > 0 || extraVars.length > 0) {
                invalidInterpolations.push(key);
            }
        }
    }
    // Calculate coverage
    const translatedCount = Array.from(baseKeys).filter((key) => targetFlat[key] && targetFlat[key].trim() !== '').length;
    const coverage = baseKeys.size > 0 ? (translatedCount / baseKeys.size) * 100 : 0;
    return {
        locale: targetLocale,
        missingKeys,
        extraKeys,
        emptyValues,
        invalidInterpolations,
        coverage,
    };
}
/**
 * Calculate translation statistics
 */
function calculateTranslationStats(locale, messages) {
    const flat = flattenMessages(messages);
    const totalKeys = Object.keys(flat).length;
    const translatedKeys = Object.values(flat).filter((value) => value && value.trim() !== '').length;
    const coverage = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;
    return {
        locale,
        totalKeys,
        translatedKeys,
        coverage,
    };
}
/**
 * Find duplicate translations (same value for different keys)
 */
function findDuplicateTranslations(messages) {
    const flat = flattenMessages(messages);
    const valueToKeys = new Map();
    for (const [key, value] of Object.entries(flat)) {
        if (!value || value.trim() === '') {
            continue;
        }
        const normalizedValue = value.trim().toLowerCase();
        const keys = valueToKeys.get(normalizedValue) || [];
        keys.push(key);
        valueToKeys.set(normalizedValue, keys);
    }
    // Filter to only duplicates
    const duplicates = new Map();
    for (const [value, keys] of valueToKeys.entries()) {
        if (keys.length > 1) {
            duplicates.set(value, keys);
        }
    }
    return duplicates;
}
/**
 * Check for potentially untranslated strings (same as base locale)
 */
function findUntranslatedStrings(baseMessages, targetMessages) {
    const baseFlat = flattenMessages(baseMessages);
    const targetFlat = flattenMessages(targetMessages);
    const untranslated = [];
    for (const [key, baseValue] of Object.entries(baseFlat)) {
        const targetValue = targetFlat[key];
        if (targetValue && targetValue === baseValue && baseValue.trim() !== '') {
            // Skip if it's a technical term or proper noun (all caps, camelCase, etc.)
            if (!/^[A-Z_]+$/.test(baseValue) && !/^[a-z][a-zA-Z0-9]*$/.test(baseValue)) {
                untranslated.push(key);
            }
        }
    }
    return untranslated;
}
/**
 * Validate ICU message format syntax
 */
function validateICUFormat(text) {
    const errors = [];
    // Check for balanced braces
    let braceCount = 0;
    for (const char of text) {
        if (char === '{') {
            braceCount++;
        }
        if (char === '}') {
            braceCount--;
        }
        if (braceCount < 0) {
            errors.push('Unmatched closing brace');
            break;
        }
    }
    if (braceCount > 0) {
        errors.push('Unmatched opening brace');
    }
    // Check for valid plural syntax
    const pluralRegex = /\{(\w+),\s*plural,\s*([^}]+)\}/g;
    let match;
    while ((match = pluralRegex.exec(text)) !== null) {
        const [, varName, pluralForms] = match;
        // Check for required 'other' form
        if (!pluralForms.includes('other')) {
            errors.push(`Plural form for '${varName}' missing required 'other' case`);
        }
    }
    // Check for valid select syntax
    const selectRegex = /\{(\w+),\s*select,\s*([^}]+)\}/g;
    while ((match = selectRegex.exec(text)) !== null) {
        const [, varName, selectForms] = match;
        // Check for required 'other' form
        if (!selectForms.includes('other')) {
            errors.push(`Select form for '${varName}' missing required 'other' case`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Generate translation coverage report
 */
function generateCoverageReport(baseLocale, locales, baseMessages) {
    const report = {};
    for (const [locale, messages] of locales.entries()) {
        if (locale === baseLocale) {
            continue;
        }
        report[locale] = validateTranslations(baseLocale, locale, baseMessages, messages);
    }
    return report;
}
