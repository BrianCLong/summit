"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPii = detectPii;
exports.buildOsintMappingSuggestions = buildOsintMappingSuggestions;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /\+?\d[\d\s().-]{7,}\d/;
function detectPii(value) {
    if (EMAIL_REGEX.test(value)) {
        return 'email';
    }
    if (PHONE_REGEX.test(value)) {
        return 'phone';
    }
    return undefined;
}
function buildOsintMappingSuggestions(record) {
    const suggestions = [];
    Object.entries(record).forEach(([field, value]) => {
        let nodeType = 'Document';
        let property = field;
        if (field === 'title') {
            nodeType = 'Report';
            property = 'title';
        }
        if (field === 'link') {
            nodeType = 'Source';
            property = 'url';
        }
        const piiWarning = value ? detectPii(value) : undefined;
        suggestions.push({
            field,
            nodeType,
            property,
            piiWarning,
        });
    });
    return suggestions;
}
