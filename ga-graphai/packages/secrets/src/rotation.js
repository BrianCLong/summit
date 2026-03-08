"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRotationStatus = computeRotationStatus;
exports.rotationStatusForRef = rotationStatusForRef;
const DAY_MS = 24 * 60 * 60 * 1000;
function computeRotationStatus(policy, now = new Date()) {
    if (!policy) {
        return {
            needsRotation: true,
            reason: 'rotation policy missing',
        };
    }
    const expiresAfterDays = policy.expiresAfterDays ?? policy.intervalDays;
    const graceDays = policy.graceDays ?? 0;
    const lastRotated = policy.lastRotated ? new Date(policy.lastRotated) : null;
    if (!lastRotated || Number.isNaN(lastRotated.getTime())) {
        return {
            intervalDays: policy.intervalDays,
            needsRotation: true,
            reason: 'last rotation unknown',
        };
    }
    const nextRotationDue = new Date(lastRotated.getTime() + policy.intervalDays * DAY_MS);
    const absoluteExpiry = new Date(lastRotated.getTime() + expiresAfterDays * DAY_MS);
    const graceCutoff = new Date(nextRotationDue.getTime() + graceDays * DAY_MS);
    const needsRotation = now > graceCutoff || now > absoluteExpiry;
    return {
        intervalDays: policy.intervalDays,
        lastRotated: lastRotated.toISOString(),
        nextRotationDue: nextRotationDue.toISOString(),
        needsRotation,
        reason: needsRotation ? 'rotation interval exceeded' : undefined,
    };
}
function rotationStatusForRef(ref, now = new Date()) {
    return computeRotationStatus(ref.rotation, now);
}
