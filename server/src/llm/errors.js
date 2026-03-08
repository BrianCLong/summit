"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingError = exports.SafetyViolationError = exports.ProviderError = exports.LLMError = void 0;
class LLMError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LLMError';
    }
}
exports.LLMError = LLMError;
class ProviderError extends LLMError {
    providerName;
    cause;
    constructor(providerName, message, cause) {
        super(`Provider '${providerName}' failed: ${message}`);
        this.providerName = providerName;
        this.cause = cause;
        this.name = 'ProviderError';
    }
}
exports.ProviderError = ProviderError;
class SafetyViolationError extends LLMError {
    guardrailName;
    constructor(guardrailName, message) {
        super(`Safety guardrail '${guardrailName}' triggered: ${message}`);
        this.guardrailName = guardrailName;
        this.name = 'SafetyViolationError';
    }
}
exports.SafetyViolationError = SafetyViolationError;
class RoutingError extends LLMError {
    constructor(message) {
        super(message);
        this.name = 'RoutingError';
    }
}
exports.RoutingError = RoutingError;
