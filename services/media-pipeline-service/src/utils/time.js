"use strict";
/**
 * Time Utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.now = now;
exports.formatDuration = formatDuration;
exports.parseTimestamp = parseTimestamp;
exports.calculateDuration = calculateDuration;
exports.addDuration = addDuration;
exports.isExpired = isExpired;
exports.getExpirationDate = getExpirationDate;
/**
 * Get current timestamp in ISO format
 */
function now() {
    return new Date().toISOString();
}
/**
 * Convert milliseconds to human-readable duration
 */
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}
/**
 * Parse ISO timestamp to milliseconds
 */
function parseTimestamp(isoString) {
    return new Date(isoString).getTime();
}
/**
 * Calculate duration between two timestamps
 */
function calculateDuration(start, end) {
    return parseTimestamp(end) - parseTimestamp(start);
}
/**
 * Add duration to timestamp
 */
function addDuration(timestamp, durationMs) {
    return new Date(parseTimestamp(timestamp) + durationMs).toISOString();
}
/**
 * Check if timestamp is expired
 */
function isExpired(expiresAt) {
    return parseTimestamp(expiresAt) < Date.now();
}
/**
 * Get expiration timestamp based on retention days
 */
function getExpirationDate(retentionDays) {
    const expirationMs = Date.now() + retentionDays * 24 * 60 * 60 * 1000;
    return new Date(expirationMs).toISOString();
}
