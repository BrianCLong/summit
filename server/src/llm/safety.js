"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIIGuardrail = void 0;
class PIIGuardrail {
    name = 'pii-redaction';
    // Simple regex for email/phone (demonstration only)
    emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    async validateRequest(request) {
        // In a real system, this would call a PII service or use a robust library
        // For scaffolding, we just check and potentially warn or strip
        // Cloning to avoid mutation side-effects on original object if used elsewhere
        const cleanMessages = request.messages.map(msg => ({
            ...msg,
            content: msg.content.replace(this.emailRegex, '[REDACTED_EMAIL]')
        }));
        return {
            ...request,
            messages: cleanMessages
        };
    }
    async validateResponse(response) {
        const cleanText = response.text.replace(this.emailRegex, '[REDACTED_EMAIL]');
        return {
            ...response,
            text: cleanText
        };
    }
}
exports.PIIGuardrail = PIIGuardrail;
