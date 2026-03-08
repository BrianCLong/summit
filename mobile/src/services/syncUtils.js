"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchesNeeded = batchesNeeded;
exports.summarizeStatus = summarizeStatus;
function batchesNeeded(total, batchSize) {
    if (total <= 0)
        return 0;
    return Math.ceil(total / batchSize);
}
function summarizeStatus(status, lastSync, queueSize) {
    const syncStamp = lastSync ? lastSync.toISOString() : 'never';
    const queue = queueSize ?? 0;
    return `${status}|queue:${queue}|last:${syncStamp}`;
}
