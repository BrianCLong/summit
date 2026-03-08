"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.canonicalString = canonicalString;
function canonicalize(value) {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => canonicalize(item));
    }
    const entries = Object.entries(value).sort(([a], [b]) => {
        if (a < b)
            return -1;
        if (a > b)
            return 1;
        return 0;
    });
    const ordered = {};
    for (const [key, item] of entries) {
        ordered[key] = canonicalize(item);
    }
    return ordered;
}
function canonicalString(value) {
    return JSON.stringify(canonicalize(value));
}
