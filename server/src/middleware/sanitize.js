"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sanitizeRequest;
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
function sanitizeValue(input) {
    if (typeof input === 'string') {
        return escapeHtml(input).trim().slice(0, 10000);
    }
    if (Array.isArray(input)) {
        return input.slice(0, 1000).map((item) => sanitizeValue(item));
    }
    if (input && typeof input === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            if (Object.keys(sanitized).length >= 100)
                break;
            sanitized[key] = sanitizeValue(value);
        }
        return sanitized;
    }
    return input;
}
function sanitizeRequest(req, _res, next) {
    if (req.body !== undefined) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query !== undefined) {
        req.query = sanitizeValue(req.query);
    }
    if (req.params !== undefined) {
        req.params = sanitizeValue(req.params);
    }
    next();
}
