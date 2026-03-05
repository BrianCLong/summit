import type { QuarantineCase, QuarantineDisposition } from "./types";
import type { UUID } from "../../writeset/types";

export interface QuarantineStore {
  putCase(c: QuarantineCase): Promise<void>;
  getCase(id: UUID): Promise<QuarantineCase | null>;
  listCases(opts?: { status?: QuarantineDisposition; limit?: number }): Promise<QuarantineCase[]>;
  updateStatus(id: UUID, status: QuarantineDisposition): Promise<void>;
}

// Minimal in-memory store for laptop demo
export class MemoryQuarantineStore implements QuarantineStore {
  private cases = new Map<UUID, QuarantineCase>();

  async putCase(c: QuarantineCase) { this.cases.set(c.quarantine_case_id, c); }
  async getCase(id: UUID) { return this.cases.get(id) ?? null; }
  async listCases(opts?: { status?: QuarantineDisposition; limit?: number }) {
    const arr = [...this.cases.values()].sort((a,b) => a.created_at.localeCompare(b.created_at)).reverse();
    const filtered = opts?.status ? arr.filter(x => x.status === opts.status) : arr;
    return filtered.slice(0, opts?.limit ?? 200);
  }
  async updateStatus(id: UUID, status: QuarantineDisposition) {
    const c = this.cases.get(id);
    if (!c) return;
    this.cases.set(id, { ...c, status });
  }
}
