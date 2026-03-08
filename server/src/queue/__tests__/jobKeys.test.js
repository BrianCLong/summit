"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const jobKeys_js_1 = require("../jobKeys.js");
const crypto_1 = require("crypto");
(0, globals_1.describe)('generateJobKey', () => {
    const jobType = 'receipt-ingestion';
    const idempotencyKey = '123e4567-e89b-12d3-a456-426614174000';
    (0, globals_1.it)('should return undefined when feature is disabled', () => {
        const key = (0, jobKeys_js_1.generateJobKey)(jobType, idempotencyKey, false);
        (0, globals_1.expect)(key).toBeUndefined();
    });
    (0, globals_1.it)('should return a deterministic key when feature is enabled', () => {
        const key1 = (0, jobKeys_js_1.generateJobKey)(jobType, idempotencyKey, true);
        const key2 = (0, jobKeys_js_1.generateJobKey)(jobType, idempotencyKey, true);
        (0, globals_1.expect)(key1).toBeDefined();
        (0, globals_1.expect)(key1).toBe(key2);
        // Verify structure
        const expectedHash = (0, crypto_1.createHash)('sha256')
            .update(`${jobType}:${idempotencyKey}`)
            .digest('hex');
        (0, globals_1.expect)(key1).toBe(`${jobType}:${expectedHash}`);
    });
    (0, globals_1.it)('should return different keys for different inputs', () => {
        const key1 = (0, jobKeys_js_1.generateJobKey)(jobType, 'key1', true);
        const key2 = (0, jobKeys_js_1.generateJobKey)(jobType, 'key2', true);
        const key3 = (0, jobKeys_js_1.generateJobKey)('other-type', 'key1', true);
        (0, globals_1.expect)(key1).not.toBe(key2);
        (0, globals_1.expect)(key1).not.toBe(key3);
    });
});
