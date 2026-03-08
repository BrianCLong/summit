"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMutation = addMutation;
exports.getPendingMutations = getPendingMutations;
exports.deleteMutation = deleteMutation;
exports.updateMutationRetry = updateMutationRetry;
exports.setSyncStatus = setSyncStatus;
exports.getSyncStatus = getSyncStatus;
// Stub implementations for offline sync
async function addMutation(_mutation) {
    return crypto.randomUUID();
}
async function getPendingMutations() {
    return [];
}
async function deleteMutation(_id) {
    // No-op
}
async function updateMutationRetry(_id, _retryCount) {
    // No-op
}
async function setSyncStatus(_status) {
    // No-op
}
async function getSyncStatus() {
    return { lastSyncAt: null, pendingCount: 0, isOnline: true };
}
