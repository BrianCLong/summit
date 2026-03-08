"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrub = scrub;
const PII = [/\b\d{3}-\d{2}-\d{4}\b/i, /@/, /credit\s*card/i];
function scrub(text) {
    return PII.some((r) => r.test(text)) ? '[REDACTED]' : text;
}
