import type { CogWriteOp, CogRejectionError } from "./types";

export type QuarantineRecord = {
  op: CogWriteOp;
  reason: "QUARANTINE" | "REVIEW";
  recordedAt: string;
  errors: CogRejectionError[];
};

export interface CogQuarantineStore {
  put(record: QuarantineRecord): Promise<void>;
}

export class InMemoryCogQuarantineStore implements CogQuarantineStore {
  private records: QuarantineRecord[] = [];

  async put(record: QuarantineRecord): Promise<void> {
    this.records.push(record);
  }
}
