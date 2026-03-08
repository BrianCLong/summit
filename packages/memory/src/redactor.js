"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Redactor = void 0;
class Redactor {
    patterns = [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, // Credit Card
    ];
    constructor(customPatterns = []) {
        this.patterns = [...this.patterns, ...customPatterns];
    }
    redact(text) {
        let redacted = text;
        for (const pattern of this.patterns) {
            const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
            const globalPattern = new RegExp(pattern.source, flags);
            redacted = redacted.replace(globalPattern, '[REDACTED]');
        }
        return redacted;
    }
}
exports.Redactor = Redactor;
