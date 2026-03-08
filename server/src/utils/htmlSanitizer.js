"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = sanitizeHtml;
exports.deepSanitize = deepSanitize;
// @ts-nocheck
const dompurify_1 = __importDefault(require("dompurify"));
const jsdom_1 = require("jsdom");
const jsdomWindow = new jsdom_1.JSDOM('').window;
const DOMPurify = (0, dompurify_1.default)(jsdomWindow);
/**
 * Sanitize HTML using DOMPurify with a locked-down profile suitable for server-side use.
 */
function sanitizeHtml(value) {
    const sanitized = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
    return typeof sanitized === 'string' ? sanitized : String(sanitized);
}
/**
 * Recursively sanitize unknown input, applying DOMPurify to any string leaf nodes.
 */
function deepSanitize(input) {
    if (typeof input === 'string')
        return sanitizeHtml(input);
    if (Array.isArray(input))
        return input.map((entry) => deepSanitize(entry));
    if (input && typeof input === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = deepSanitize(value);
        }
        return sanitized;
    }
    return input;
}
