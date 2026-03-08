"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCypher = sanitizeCypher;
exports.isBlocked = isBlocked;
const BLOCKLIST = [
    /\bCREATE\b/i,
    /\bMERGE\b/i,
    /\bDELETE\b/i,
    /\bDETACH\b/i,
    /\bSET\b/i,
    /\bDROP\b/i,
    /\bCALL\s+dbms\./i,
    /apoc\./i,
    /LOAD\s+CSV/i,
    /COPY\s+INTO/i,
];
function sanitizeCypher(cypher) {
    let cleaned = cypher.replace(/;+/g, '').trim();
    const warnings = [];
    BLOCKLIST.forEach((pattern) => {
        if (pattern.test(cleaned)) {
            warnings.push(`Blocked pattern: ${pattern}`);
            cleaned = cleaned.replace(pattern, '/* blocked */');
        }
    });
    return { cleaned, warnings };
}
function isBlocked(cypher) {
    const reasons = BLOCKLIST.filter((pattern) => pattern.test(cypher)).map((p) => `Rejected because it matches ${p}`);
    return { blocked: reasons.length > 0, reasons };
}
