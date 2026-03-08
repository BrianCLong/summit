"use strict";
/**
 * ID generation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.isValidUUID = isValidUUID;
const crypto_1 = require("crypto");
/**
 * Generate a UUID v4
 */
function generateId() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Validate a UUID format
 */
function isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}
