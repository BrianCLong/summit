"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBoundary = exports.ContentBoundary = void 0;
const crypto_1 = __importDefault(require("crypto"));
const injectionPhrases = [
    'ignore previous instructions',
    'override safety',
    'exfiltrate',
    'leak secret',
    'disable policy',
];
const secretPattern = /(api|private)?\s*(key|token|secret|password)\b/gi;
const envPattern = /[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD)/g;
class ContentBoundary {
    maxLength;
    constructor(maxLength = 2000) {
        this.maxLength = maxLength;
    }
    markUntrusted(raw) {
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
        const redactions = [];
        let cleaned = text;
        injectionPhrases.forEach((phrase) => {
            const regex = new RegExp(phrase, 'gi');
            if (regex.test(cleaned)) {
                cleaned = cleaned.replace(regex, '[blocked-directive]');
                redactions.push(`blocked:${phrase}`);
            }
        });
        const secretMatches = cleaned.match(secretPattern) || [];
        if (secretMatches.length > 0) {
            redactions.push('secret-phrase');
            cleaned = cleaned.replace(secretPattern, '[redacted-secret]');
        }
        const envMatches = cleaned.match(envPattern) || [];
        if (envMatches.length > 0) {
            redactions.push('env-name');
            cleaned = cleaned.replace(envPattern, '[redacted-env]');
        }
        const hash = crypto_1.default.createHash('sha256').update(cleaned).digest('hex');
        let truncated = false;
        let bounded = cleaned;
        if (cleaned.length > this.maxLength) {
            truncated = true;
            const head = cleaned.slice(0, this.maxLength);
            bounded = `${head}\n...[truncated:${cleaned.length - this.maxLength} chars]\nsha256:${hash}`;
        }
        return {
            text: bounded,
            truncated,
            hash,
            redactions,
            tags: ['UNTRUSTED'],
        };
    }
}
exports.ContentBoundary = ContentBoundary;
exports.defaultBoundary = new ContentBoundary();
