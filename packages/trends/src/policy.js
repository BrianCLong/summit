"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTouchpointEvent = validateTouchpointEvent;
function validateTouchpointEvent(e) {
    // Deny-by-default: must have non-empty signature
    if (!e.signature || e.signature.trim().length < 16) {
        return { ok: false, reason: "missing_or_short_signature" };
    }
    // Deny-by-default: must have valid type
    const validTypes = ["engagement", "provenance", "verification"];
    if (!validTypes.includes(e.type)) {
        return { ok: false, reason: "invalid_event_type" };
    }
    return { ok: true };
}
