"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
function sortKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return Object.fromEntries(entries.map(([key, val]) => [key, sortKeys(val)]));
    }
    return value;
}
function canonicalize(value) {
    const sorted = sortKeys(value);
    return JSON.stringify(sorted);
}
