import { createHash, randomUUID } from "node:crypto";
import {
  AuditTrailEntry,
  Entity,
  EventRecord,
  IngestRequest,
  Relationship,
  TimelineItem,
} from "../types.js";
import { enforceResidency } from "../governance/residency.js";

export class InMemoryIngestStore {
  private entities = new Map<string, Entity>();
  private relationships = new Map<string, Relationship>();
  private events = new Map<string, EventRecord>();
  private ingestedKeys = new Set<string>();
  private auditTrail: AuditTrailEntry[] = [];

  ingest(request: IngestRequest, allowedResidency: string[]): void {
    const key = request.idempotencyKey ?? this.computeKey(request);
    if (this.ingestedKeys.has(key)) {
      this.auditTrail.push({
        timestamp: new Date().toISOString(),
        message: "Duplicate ingest blocked",
        context: { key },
      });
      return;
    }

    enforceResidency(request.entity.tags, allowedResidency, this.auditTrail);
    this.entities.set(request.entity.id, request.entity);

    if (request.relationships) {
      for (const rel of request.relationships) {
        enforceResidency(rel.tags, allowedResidency, this.auditTrail);
        this.relationships.set(rel.id, rel);
      }
    }

    if (request.events) {
      for (const event of request.events) {
        enforceResidency(event.tags, allowedResidency, this.auditTrail);
        this.events.set(event.id, event);
      }
    }

    this.ingestedKeys.add(key);
    this.auditTrail.push({
      timestamp: new Date().toISOString(),
      message: "Ingest succeeded",
      context: { key, entityId: request.entity.id },
    });
  }

  getAuditTrail(): AuditTrailEntry[] {
    return [...this.auditTrail];
  }

  getTimeline(filter: {
    entityId?: string;
    source?: string;
    confidenceGte?: number;
    start?: string;
    end?: string;
  }): TimelineItem[] {
    return [...this.events.values()]
      .filter((event) => {
        if (filter.entityId && event.entityId !== filter.entityId) return false;
        if (filter.source && event.source !== filter.source) return false;
        if (filter.confidenceGte !== undefined && event.confidence < filter.confidenceGte)
          return false;
        const occurred = new Date(event.occurredAt).getTime();
        if (filter.start && occurred < new Date(filter.start).getTime()) return false;
        if (filter.end && occurred > new Date(filter.end).getTime()) return false;
        return true;
      })
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .map((event) => ({
        id: event.id,
        entityId: event.entityId,
        occurredAt: event.occurredAt,
        source: event.source,
        confidence: event.confidence,
        provenance: event.provenance,
        payload: event.payload,
      }));
  }

  private computeKey(request: IngestRequest): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify(request));
    return hash.digest("hex");
  }
}

export function buildProvenance(
  source: string,
  schemaVersion: string
): {
  id: string;
  ingestedAt: string;
  hash: string;
  schemaVersion: string;
} {
  const ingestedAt = new Date().toISOString();
  const hash = createHash("sha256").update(`${source}-${ingestedAt}`).digest("hex");
  return {
    id: randomUUID(),
    ingestedAt,
    hash,
    schemaVersion,
  };
}
