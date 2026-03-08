"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.estimateTokens = estimateTokens;
exports.truncateToTokenLimit = truncateToTokenLimit;
const FALLBACK_TOKEN_RATIO = 4;
function stableStringify(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value !== 'object') {
        return String(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    const entries = Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => `${key}:${stableStringify(val)}`);
    return `{${entries.join(',')}}`;
}
function estimateTokens(value) {
    const text = stableStringify(value);
    if (!text)
        return 0;
    return Math.max(1, Math.ceil(text.length / FALLBACK_TOKEN_RATIO));
}
function truncateToTokenLimit(text, maxTokens) {
    if (maxTokens <= 0)
        return '';
    const maxChars = maxTokens * FALLBACK_TOKEN_RATIO;
    if (text.length <= maxChars)
        return text;
    return text.slice(0, maxChars);
}
