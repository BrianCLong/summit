"use strict";
/**
 * Environment Normalization
 *
 * Ensures deterministic execution by normalizing timezone, locale,
 * and other environment-dependent behaviors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_DEFAULTS = void 0;
exports.normalizeEnvironment = normalizeEnvironment;
exports.getNormalizedEnv = getNormalizedEnv;
exports.deterministicSort = deterministicSort;
exports.deterministicStringify = deterministicStringify;
/**
 * Default values for deterministic execution
 */
exports.ENV_DEFAULTS = {
    TZ: 'UTC',
    LOCALE: 'C', // POSIX locale for maximum consistency
    LC_ALL: 'C',
    LANG: 'C',
};
/**
 * Apply environment normalization
 * Sets TZ and locale to ensure consistent behavior across systems.
 *
 * @param options - Override values for TZ and locale
 */
function normalizeEnvironment(options = {}) {
    const tz = options.tz ?? exports.ENV_DEFAULTS.TZ;
    const locale = options.locale ?? exports.ENV_DEFAULTS.LOCALE;
    // Set timezone
    process.env.TZ = tz;
    // Set locale environment variables
    process.env.LC_ALL = locale;
    process.env.LANG = locale;
    process.env.LANGUAGE = locale;
    // Force Node.js to recognize the TZ change
    // This is a workaround for Node.js caching the timezone
    const tzOffset = new Date().getTimezoneOffset();
    if (tzOffset !== 0 && tz === 'UTC') {
        // Re-evaluate timezone by creating a new date
        // Node.js will pick up TZ on next Date construction
    }
}
/**
 * Get current normalized environment info
 */
function getNormalizedEnv(options = {}) {
    return {
        tz: options.tz ?? process.env.TZ ?? exports.ENV_DEFAULTS.TZ,
        locale: options.locale ?? process.env.LC_ALL ?? exports.ENV_DEFAULTS.LOCALE,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
    };
}
/**
 * Deterministic sort function for arrays
 * Ensures consistent ordering across platforms.
 */
function deterministicSort(arr, keyFn) {
    const sorted = [...arr];
    sorted.sort((a, b) => {
        const keyA = keyFn ? keyFn(a) : String(a);
        const keyB = keyFn ? keyFn(b) : String(b);
        return keyA.localeCompare(keyB, 'en', { sensitivity: 'base' });
    });
    return sorted;
}
/**
 * Deterministic JSON stringification
 * Sorts object keys for consistent output.
 */
function deterministicStringify(obj, space) {
    return JSON.stringify(obj, sortKeys, space);
}
/**
 * JSON replacer that sorts object keys
 */
function sortKeys(_key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sorted = {};
        const keys = Object.keys(value).sort();
        for (const k of keys) {
            sorted[k] = value[k];
        }
        return sorted;
    }
    return value;
}
