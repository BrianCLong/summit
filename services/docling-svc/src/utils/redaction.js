"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeLogPayload = exports.redactSensitive = void 0;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_REGEX = /(api|secret|token|key)[=:]\s*([a-z0-9\-_.]+)/gi;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
const redactSensitive = (input) => {
    return input
        .replace(EMAIL_REGEX, '[redacted-email]')
        .replace(TOKEN_REGEX, (_match, prefix) => `${prefix}=[redacted-secret]`)
        .replace(CREDIT_CARD_REGEX, '[redacted-pan]');
};
exports.redactSensitive = redactSensitive;
const safeLogPayload = (payload) => {
    const serialized = JSON.stringify(payload);
    const sanitized = (0, exports.redactSensitive)(serialized);
    return {
        sanitized,
        wasRedacted: sanitized !== serialized,
    };
};
exports.safeLogPayload = safeLogPayload;
