import type { BatchReplayRecord } from "./types";

export interface CogReplayLedger {
  get(batchSignature: string): Promise<BatchReplayRecord | null>;
  put(record: BatchReplayRecord): Promise<void>;
}

export class InMemoryCogReplayLedger implements CogReplayLedger {
  private records = new Map<string, BatchReplayRecord>();

  async get(batchSignature: string): Promise<BatchReplayRecord | null> {
    return this.records.get(batchSignature) ?? null;
  }

  async put(record: BatchReplayRecord): Promise<void> {
    this.records.set(record.batchSignature, record);
  }
}
