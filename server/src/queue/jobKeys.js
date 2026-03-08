"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJobKey = generateJobKey;
const crypto_1 = require("crypto");
/**
 * Generates a deterministic job key based on the job type and an idempotency key.
 * This ensures that if the same job is submitted multiple times with the same idempotency key,
 * it will map to the same job ID in the queue, preventing duplicates.
 *
 * @param jobType - The type of the job (e.g., 'receipt-ingestion')
 * @param idempotencyKey - The client-provided idempotency key
 * @param featureEnabled - Feature flag to enable/disable deterministic keys (default: false)
 * @returns A deterministic string key if enabled, otherwise undefined
 */
function generateJobKey(jobType, idempotencyKey, featureEnabled = false) {
    if (!featureEnabled) {
        return undefined;
    }
    const hash = (0, crypto_1.createHash)('sha256')
        .update(`${jobType}:${idempotencyKey}`)
        .digest('hex');
    return `${jobType}:${hash}`;
}
