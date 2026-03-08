"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeOutput = void 0;
const injectionPatterns = [
    /^system:/i,
    /^assistant:/i,
    /^developer:/i,
    /<\/?script/i,
    /\btool\s*:\s*/i,
];
const sanitizeString = (value) => {
    const lines = value
        .split('\n')
        .filter((line) => !injectionPatterns.some((pattern) => pattern.test(line)));
    return lines.join('\n').trim();
};
const sanitizeOutput = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => (0, exports.sanitizeOutput)(entry));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [key, entry]) => {
            acc[key] = (0, exports.sanitizeOutput)(entry);
            return acc;
        }, {});
    }
    if (typeof value === 'string') {
        return sanitizeString(value);
    }
    return value;
};
exports.sanitizeOutput = sanitizeOutput;
