"use strict";
/**
 * Safe JSON utilities to prevent crash on circular references or invalid input
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
exports.safeJsonStringify = safeJsonStringify;
function safeJsonParse(val, fallback = null) {
    try {
        return JSON.parse(val);
    }
    catch {
        return fallback;
    }
}
function safeJsonStringify(val, fallback = '{}') {
    try {
        return JSON.stringify(val);
    }
    catch {
        return fallback;
    }
}
