"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.computeHash = computeHash;
exports.isPlainObject = isPlainObject;
exports.deepEqual = deepEqual;
exports.normalisePolicyTags = normalisePolicyTags;
exports.normaliseTools = normaliseTools;
exports.deepClone = deepClone;
const crypto_1 = require("crypto");
function stableStringify(value) {
    return stringifyInternal(value);
}
function stringifyInternal(value) {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return JSON.stringify(value);
        }
        throw new TypeError('Cannot canonicalise non-finite numbers');
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (typeof value === 'boolean' || typeof value === 'string') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        const items = value.map((item) => stringifyInternal(item));
        return `[${items.join(',')}]`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value)
            .filter(([, val]) => typeof val !== 'undefined')
            .map(([key, val]) => `${JSON.stringify(key)}:${stringifyInternal(val)}`)
            .sort();
        return `{${entries.join(',')}}`;
    }
    if (typeof value === 'undefined') {
        return 'null';
    }
    throw new TypeError(`Unsupported value type: ${typeof value}`);
}
function computeHash(value) {
    const canonical = typeof value === 'string' ? value : stableStringify(value);
    return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
}
function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (typeof a !== typeof b) {
        return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((item, index) => deepEqual(item, b[index]));
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keysA = Object.keys(a).sort();
        const keysB = Object.keys(b).sort();
        if (keysA.length !== keysB.length) {
            return false;
        }
        return keysA.every((key, index) => key === keysB[index] && deepEqual(a[key], b[key]));
    }
    return stableStringify(a) === stableStringify(b);
}
function normalisePolicyTags(tags) {
    return Array.from(new Set(tags.map((tag) => tag.trim()))).sort();
}
function normaliseTools(tools) {
    return [...tools].sort((a, b) => {
        if (a.name === b.name) {
            return a.version.localeCompare(b.version);
        }
        return a.name.localeCompare(b.name);
    });
}
function deepClone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}
