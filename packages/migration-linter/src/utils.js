"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasOverride = hasOverride;
exports.stripSqlComments = stripSqlComments;
exports.normalizeWhitespace = normalizeWhitespace;
const destructiveOverridePattern = /APPROVED_DESTRUCTIVE_CHANGE:\s*[A-Za-z0-9_-]+/i;
function hasOverride(content) {
    return destructiveOverridePattern.test(content);
}
function stripSqlComments(sql) {
    const withoutBlock = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
    return withoutBlock
        .split('\n')
        .map((line) => line.replace(/--.*$/, ''))
        .join('\n');
}
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}
