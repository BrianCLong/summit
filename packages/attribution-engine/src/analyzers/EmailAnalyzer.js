"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAnalyzer = void 0;
class EmailAnalyzer {
    async analyzeEmail(email) {
        const domain = email.split('@')[1];
        return { valid: true, domain, breaches: [] };
    }
}
exports.EmailAnalyzer = EmailAnalyzer;
