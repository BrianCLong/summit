"use strict";
/**
 * Time Window Domain Model
 *
 * Provides a shared, normalized definition of time windows
 * to be used across all analyst tools (Timeline, Graph, Map).
 *
 * This acts as the "Single Source of Truth" for time representation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWindow = normalizeWindow;
exports.assertValidWindow = assertValidWindow;
exports.fromIsoWindow = fromIsoWindow;
exports.toIsoWindow = toIsoWindow;
/**
 * Normalizes a time window to ensure invariants.
 * - Clamps start/end
 * - Enforces start <= end
 */
function normalizeWindow(w) {
    const start = Math.min(w.startMs, w.endMs);
    const end = Math.max(w.startMs, w.endMs);
    // Potential future place for granularity rounding logic
    return {
        ...w,
        startMs: start,
        endMs: end
    };
}
/**
 * Asserts that a time window is valid.
 * Useful for dev-time invariants and runtime checks.
 */
function assertValidWindow(w) {
    if (!(Number.isFinite(w.startMs) && Number.isFinite(w.endMs))) {
        throw new Error(`Invalid window: start=${w.startMs}, end=${w.endMs}`);
    }
    if (w.endMs < w.startMs) {
        throw new Error(`Window reversed: start=${w.startMs} > end=${w.endMs}`);
    }
}
/**
 * Helper to convert legacy ISO string window to new TimeWindow
 */
function fromIsoWindow(from, to, granularity = 'minute', tzMode = 'UTC') {
    return normalizeWindow({
        startMs: new Date(from).getTime(),
        endMs: new Date(to).getTime(),
        granularity,
        tzMode
    });
}
/**
 * Helper to convert TimeWindow to legacy ISO object
 */
function toIsoWindow(w) {
    return {
        from: new Date(w.startMs).toISOString(),
        to: new Date(w.endMs).toISOString()
    };
}
