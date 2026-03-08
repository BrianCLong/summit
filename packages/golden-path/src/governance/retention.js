"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRetentionSweeper = runRetentionSweeper;
function runRetentionSweeper(events, now, dryRun = false, auditTrail = []) {
    const kept = [];
    const deleted = [];
    for (const event of events) {
        const expiry = new Date(event.provenance.ingestedAt);
        expiry.setDate(expiry.getDate() + event.tags.retentionDays);
        if (expiry <= now) {
            const entry = {
                timestamp: now.toISOString(),
                message: dryRun ? 'Retention candidate' : 'Retention delete',
                context: { eventId: event.id, expiredOn: expiry.toISOString() },
            };
            auditTrail.push(entry);
            if (dryRun) {
                kept.push(event);
            }
            else {
                deleted.push(event.id);
            }
        }
        else {
            kept.push(event);
        }
    }
    return { deletedIds: deleted, remaining: kept };
}
