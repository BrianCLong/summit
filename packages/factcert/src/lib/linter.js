"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORBIDDEN_TERMS = void 0;
exports.lintContent = lintContent;
exports.lintObject = lintObject;
exports.FORBIDDEN_TERMS = ['admissible', 'compliant', 'fraud', 'guaranteed'];
function lintContent(content) {
    const violations = [];
    // Using a simpler approach for now: strictly checking for the presence of the word
    // surrounded by non-word characters or start/end of string.
    const lower = content.toLowerCase();
    for (const term of exports.FORBIDDEN_TERMS) {
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(lower)) {
            violations.push(term);
        }
    }
    return violations;
}
function lintObject(obj) {
    // Convert to string and lint
    // This is a broad check, might catch keys or structural values.
    const str = JSON.stringify(obj);
    return lintContent(str);
}
