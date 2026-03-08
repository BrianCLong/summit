"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIIGuardrail = void 0;
class PIIGuardrail {
    name = 'pii-guardrail';
    async preProcess(request) {
        // Basic redaction (stub)
        // In a real scenario, this would use a regex or a dedicated PII service
        if (request.prompt && request.prompt.includes('SECRET_KEY')) {
            return {
                ...request,
                prompt: request.prompt.replace(/SECRET_KEY/g, '[REDACTED]'),
                metadata: { ...request.metadata, redacted: true }
            };
        }
        return request;
    }
    async postProcess(request, result) {
        // Post-call check
        if (result.text && result.text.includes('SECRET_KEY')) {
            return {
                ...result,
                text: result.text.replace(/SECRET_KEY/g, '[REDACTED]'),
                metadata: { ...result.metadata, redacted: true }
            };
        }
        return result;
    }
}
exports.PIIGuardrail = PIIGuardrail;
