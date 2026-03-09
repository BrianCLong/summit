import { randomUUID } from "node:crypto";

import type {
  UncertaintyRecord,
  UncertaintyState,
  UncertaintyScores,
  UncertaintyMeta,
} from "./models.js";

export class UncertaintyRegistry {
  private records: Map<string, UncertaintyRecord> = new Map();

  createRecord(
    entityRef: string,
    initialMetrics?: Partial<UncertaintyScores>,
    meta?: Partial<UncertaintyMeta>
  ): UncertaintyRecord {
    const id = randomUUID();
    const now = new Date().toISOString();

    const scores: UncertaintyScores = {
      epistemic_score: 0.0,
      aleatoric_score: 0.0,
      disagreement_index: 0.0,
      evidence_coverage: 1.0,
      ...initialMetrics,
    };

    const metadata: UncertaintyMeta = {
      category: null,
      created_at: now,
      updated_at: now,
      source_agent: null,
      human_overrides: false,
      ...meta,
    };

    const record: UncertaintyRecord = {
      id,
      appliesTo: entityRef,
      state: "Detected",
      scores,
      meta: metadata,
    };

    this.records.set(id, record);
    return record;
  }

  updateRecord(
    id: string,
    metricsPatch?: Partial<UncertaintyScores>,
    newState?: UncertaintyState
  ): UncertaintyRecord | null {
    const record = this.records.get(id);
    if (!record) {
      return null;
    }

    if (metricsPatch) {
      record.scores = { ...record.scores, ...metricsPatch };
    }

    if (newState) {
      record.state = newState;
    }

    record.meta.updated_at = new Date().toISOString();
    this.records.set(id, record);
    return record;
  }

  findByEntity(entityRef: string): UncertaintyRecord[] {
    return Array.from(this.records.values()).filter((r) => r.appliesTo === entityRef);
  }

  getAll(): UncertaintyRecord[] {
    return Array.from(this.records.values());
  }
}

export const globalRegistry = new UncertaintyRegistry();
