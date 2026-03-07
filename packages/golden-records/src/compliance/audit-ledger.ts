import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { AuditEvent, AuditEventAction } from "@intelgraph/mdm-core";

export interface AuditEventInput {
  recordId: string;
  recordType: string;
  tenantId: string;
  actor: string;
  action: AuditEventAction;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export class AuditLedger {
  private events: AuditEvent[] = [];

  recordEvent(input: AuditEventInput): AuditEvent {
    const timestamp = input.timestamp ?? new Date();
    const prevHash = this.events[this.events.length - 1]?.hash;
    const payload = {
      ...input,
      timestamp: timestamp.toISOString(),
      prevHash,
    };

    const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    const event: AuditEvent = {
      id: uuidv4(),
      ...input,
      timestamp,
      prevHash,
      hash,
    };

    this.events.push(event);
    return event;
  }

  getEventsForRecord(recordId: string): AuditEvent[] {
    return this.events.filter((e) => e.recordId === recordId);
  }

  getAllEvents(): AuditEvent[] {
    return [...this.events];
  }

  verifyIntegrity(): boolean {
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const prevHash = i === 0 ? undefined : this.events[i - 1].hash;
      const payload = {
        recordId: event.recordId,
        recordType: event.recordType,
        tenantId: event.tenantId,
        actor: event.actor,
        action: event.action,
        reason: event.reason,
        metadata: event.metadata,
        timestamp: event.timestamp.toISOString(),
        prevHash,
      };
      const expected = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
      if (expected !== event.hash || event.prevHash !== prevHash) {
        return false;
      }
    }
    return true;
  }
}
