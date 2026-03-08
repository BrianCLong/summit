"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
function safeJsonParse(payload) {
    try {
        return JSON.parse(payload);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
        throw new Error(`Failed to parse JSON response: ${message}`);
    }
}
