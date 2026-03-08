"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextPacker = void 0;
const crypto_1 = __importDefault(require("crypto"));
const DEFAULT_ALLOWED_FIELDS = ['id', 'name', 'summary', 'type', 'createdAt'];
function sanitizeValue(value, redactedFields, canary) {
    if (value == null)
        return value;
    if (typeof value === 'string') {
        const sanitized = value.replace(/(password|secret|api key)/gi, '[REDACTED]');
        if (canary && sanitized.includes(canary)) {
            redactedFields.push('canary');
            return sanitized.replace(new RegExp(canary, 'g'), '[REDACTED]');
        }
        return sanitized;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, redactedFields, canary));
    }
    if (typeof value === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            if (!DEFAULT_ALLOWED_FIELDS.includes(key)) {
                redactedFields.push(key);
                continue;
            }
            result[key] = sanitizeValue(val, redactedFields, canary);
        }
        return result;
    }
    return value;
}
function estimateTokens(text) {
    return text.split(/\s+/).filter(Boolean).length;
}
class ContextPacker {
    maxBytes;
    maxTokens;
    constructor(maxBytes = 4096, maxTokens = 800) {
        this.maxBytes = maxBytes;
        this.maxTokens = maxTokens;
    }
    build(input) {
        const redactedFields = [];
        const provenance = [];
        const sections = {};
        const orderedSections = [
            ['entities', input.entities ?? []],
            ['notes', input.notes ?? []],
            ['docsMetadata', input.docsMetadata ?? []],
            ['hypotheses', input.hypotheses ?? []],
        ];
        for (const [sectionName, data] of orderedSections) {
            const sanitized = sanitizeValue(data, redactedFields, input.canarySecret);
            sections[sectionName] = sanitized;
            provenance.push(`${sectionName}:${crypto_1.default.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 8)}`);
        }
        const serialized = JSON.stringify(sections);
        let bytes = Buffer.byteLength(serialized, 'utf8');
        let tokens = estimateTokens(serialized);
        const warnings = [];
        if (bytes > this.maxBytes || tokens > this.maxTokens) {
            warnings.push('Context truncated to respect size limits');
            const trimmed = serialized.slice(0, this.maxBytes);
            bytes = Buffer.byteLength(trimmed, 'utf8');
            tokens = estimateTokens(trimmed);
            sections.__truncated = true;
        }
        return {
            scope: input.scope,
            redactedFields: Array.from(new Set(redactedFields)).sort(),
            provenance,
            sections,
            size: { tokens, bytes },
            warnings,
        };
    }
}
exports.ContextPacker = ContextPacker;
