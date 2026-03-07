import type { EntityDedupRecord, OpDedupRecord } from "./types";

export interface CogDedupeLedger {
  getOp(idempotencyKey: string): Promise<OpDedupRecord | null>;
  putOp(record: OpDedupRecord): Promise<void>;

  getEntity(entityFingerprint: string): Promise<EntityDedupRecord | null>;
  putEntity(record: EntityDedupRecord): Promise<void>;
}

export class InMemoryCogDedupeLedger implements CogDedupeLedger {
  private ops = new Map<string, OpDedupRecord>();
  private entities = new Map<string, EntityDedupRecord>();

  async getOp(idempotencyKey: string): Promise<OpDedupRecord | null> {
    return this.ops.get(idempotencyKey) ?? null;
  }

  async putOp(record: OpDedupRecord): Promise<void> {
    this.ops.set(record.idempotencyKey, record);
  }

  async getEntity(entityFingerprint: string): Promise<EntityDedupRecord | null> {
    return this.entities.get(entityFingerprint) ?? null;
  }

  async putEntity(record: EntityDedupRecord): Promise<void> {
    this.entities.set(record.entityFingerprint, record);
  }
}
