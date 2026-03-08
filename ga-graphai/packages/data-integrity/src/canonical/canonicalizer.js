"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.canonicalStringify = canonicalStringify;
exports.stableHash = stableHash;
exports.normalizeWhitespace = normalizeWhitespace;
exports.normalizeUnicode = normalizeUnicode;
exports.normalizeTimestamp = normalizeTimestamp;
const node_crypto_1 = require("node:crypto");
function normalizeNumber(value) {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
        return 0;
    }
    return Number.parseFloat(value.toFixed(12));
}
function normalizeDate(value) {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString();
}
function normalizeValue(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'number') {
        return normalizeNumber(value);
    }
    if (typeof value === 'string') {
        return normalizeWhitespace(value).normalize('NFC');
    }
    if (value instanceof Date) {
        return normalizeDate(value);
    }
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeValue(entry));
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        entries.sort(([a], [b]) => a.localeCompare(b));
        return entries.reduce((acc, [key, val]) => {
            acc[key] = normalizeValue(val);
            return acc;
        }, {});
    }
    return value;
}
function canonicalize(value, options = {}) {
    if (options.normalizeTimezone && typeof value === 'string') {
        return normalizeDate(value);
    }
    return normalizeValue(value);
}
function canonicalStringify(value) {
    return JSON.stringify(canonicalize(value));
}
function stableHash(value) {
    return (0, node_crypto_1.createHash)('sha256').update(canonicalStringify(value)).digest('hex');
}
function normalizeWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function normalizeUnicode(value) {
    return value.normalize('NFC');
}
function normalizeTimestamp(value) {
    return normalizeDate(value);
}
