import { AuditTrailEntry, EventRecord } from "../types.js";

export interface RetentionResult {
  deletedIds: string[];
  remaining: EventRecord[];
}

export function runRetentionSweeper(
  events: EventRecord[],
  now: Date,
  dryRun = false,
  auditTrail: AuditTrailEntry[] = []
): RetentionResult {
  const kept: EventRecord[] = [];
  const deleted: string[] = [];
  for (const event of events) {
    const expiry = new Date(event.provenance.ingestedAt);
    expiry.setDate(expiry.getDate() + event.tags.retentionDays);
    if (expiry <= now) {
      const entry: AuditTrailEntry = {
        timestamp: now.toISOString(),
        message: dryRun ? "Retention candidate" : "Retention delete",
        context: { eventId: event.id, expiredOn: expiry.toISOString() },
      };
      auditTrail.push(entry);
      if (dryRun) {
        kept.push(event);
      } else {
        deleted.push(event.id);
      }
    } else {
      kept.push(event);
    }
  }
  return { deletedIds: deleted, remaining: kept };
}
