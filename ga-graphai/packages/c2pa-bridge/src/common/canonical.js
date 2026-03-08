"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function normalize(value) {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalize(item));
    }
    if (isObject(value)) {
        const sortedKeys = Object.keys(value).sort();
        const normalized = {};
        for (const key of sortedKeys) {
            const current = value[key];
            if (current === undefined) {
                continue;
            }
            normalized[key] = normalize(current);
        }
        return normalized;
    }
    return JSON.parse(JSON.stringify(value));
}
function canonicalize(value) {
    const normalized = normalize(value);
    return JSON.stringify(normalized);
}
