"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
/**
 * Prepares a value for canonicalization by normalizing whitespace in strings.
 */
function prepare(value) {
    if (value === null || value === undefined)
        return value;
    if (value instanceof Date)
        return value; // Pass through Date objects
    if (typeof value === 'string')
        return value.trim();
    if (Array.isArray(value))
        return value.map(prepare);
    if (typeof value === 'object') {
        const obj = value;
        const newObj = {};
        for (const key of Object.keys(obj)) {
            // Also trim keys for consistency
            newObj[key.trim()] = prepare(obj[key]);
        }
        return newObj;
    }
    return value;
}
/**
 * Deterministically stringifies a value.
 * - Sorts object keys.
 * - Uses JSON.stringify for strings (to handle escaping).
 * - Recursively processes arrays and objects.
 */
function stableStringify(value) {
    if (value === null)
        return 'null';
    if (typeof value === 'undefined')
        return '';
    if (typeof value === 'number')
        return isFinite(value) ? String(value) : 'null';
    if (typeof value === 'boolean')
        return String(value);
    if (typeof value === 'string')
        return JSON.stringify(value);
    if (value instanceof Date)
        return JSON.stringify(value);
    if (Array.isArray(value)) {
        const items = value.map((item) => stableStringify(item) || 'null');
        return '[' + items.join(',') + ']';
    }
    if (typeof value === 'object') {
        const obj = value;
        if (typeof obj.toJSON === 'function') {
            return stableStringify(obj.toJSON());
        }
        const keys = Object.keys(obj).sort();
        const parts = [];
        for (const key of keys) {
            const val = obj[key];
            // JSON.stringify skips undefined values in objects
            if (val !== undefined) {
                const strVal = stableStringify(val);
                if (strVal) {
                    parts.push(JSON.stringify(key) + ':' + strVal);
                }
            }
        }
        return '{' + parts.join(',') + '}';
    }
    return '';
}
/**
 * Canonicalizes a receipt object for deterministic hashing.
 */
function canonicalize(obj) {
    return stableStringify(prepare(obj));
}
