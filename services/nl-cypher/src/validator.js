"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCypher = validateCypher;
const sanitizer_js_1 = require("./sanitizer.js");
const DISALLOWED = [/\bUNWIND\b/i, /\bLOAD\b/i, /\bFOREACH\b/i];
function validateCypher(cypher) {
    const { cleaned, warnings: sanitizeWarnings } = (0, sanitizer_js_1.sanitizeCypher)(cypher);
    const warnings = [...sanitizeWarnings];
    const parenthesesBalanced = isBalanced(cleaned);
    if (!parenthesesBalanced) {
        warnings.push('Unbalanced parentheses detected');
    }
    DISALLOWED.forEach((pattern) => {
        if (pattern.test(cleaned)) {
            warnings.push(`Disallowed pattern: ${pattern}`);
        }
    });
    const valid = warnings.length === 0;
    return { valid, warnings };
}
function isBalanced(text) {
    let depth = 0;
    for (const char of text) {
        if (char === '(')
            depth += 1;
        if (char === ')')
            depth -= 1;
        if (depth < 0)
            return false;
    }
    return depth === 0;
}
