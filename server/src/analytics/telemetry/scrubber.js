"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryScrubber = void 0;
const crypto_1 = __importDefault(require("crypto"));
const allowlist_js_1 = require("./allowlist.js");
// Patterns that look like PII or Secrets
const PII_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN (US)
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/, // Credit Card
    /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, // JWT
    /(?:Bearer\s+)?[a-zA-Z0-9\-\._~\+\/]{20,}/, // Generic API tokens
];
class TelemetryScrubber {
    salt;
    constructor(salt) {
        this.salt = salt;
    }
    /**
     * Hashes a value deterministically with the environment salt.
     */
    hash(value) {
        if (!value)
            return '';
        return crypto_1.default
            .createHmac('sha256', this.salt)
            .update(value)
            .digest('hex');
    }
    /**
     * Sanitizes the event properties:
     * 1. Filters out properties not in the allowlist.
     * 2. Scrubs/Redacts PII from allowed string properties.
     */
    scrubProps(eventType, props) {
        const cleanProps = {};
        for (const [key, value] of Object.entries(props)) {
            if (!allowlist_js_1.ALLOWLIST[eventType]?.includes(key)) {
                continue; // Drop unknown props
            }
            cleanProps[key] = this.scrubValue(value);
        }
        return cleanProps;
    }
    scrubValue(value) {
        if (typeof value === 'string') {
            // Check for PII patterns
            for (const pattern of PII_PATTERNS) {
                if (pattern.test(value)) {
                    return '[REDACTED]';
                }
            }
            return value;
        }
        else if (Array.isArray(value)) {
            return value.map(v => this.scrubValue(v));
        }
        else if (typeof value === 'object' && value !== null) {
            // Recursive scrubbing for nested objects if allowed
            // For now, our allowlist is flat, but let's be safe
            const result = {};
            for (const k in value) {
                result[k] = this.scrubValue(value[k]);
            }
            return result;
        }
        return value;
    }
}
exports.TelemetryScrubber = TelemetryScrubber;
