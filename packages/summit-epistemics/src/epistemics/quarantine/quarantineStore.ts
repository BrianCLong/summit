import type { QuarantineCase, QuarantineDisposition } from "./types.js";
import type { UUID } from "../../writeset/types.js";

export interface QuarantineStore {
  putCase(c: QuarantineCase): Promise<void>;
  getCase(id: UUID): Promise<QuarantineCase | null>;
  listCases(opts?: { status?: QuarantineDisposition; limit?: number }): Promise<QuarantineCase[]>;
  updateStatus(id: UUID, status: QuarantineDisposition): Promise<void>;
}

/**
 * In-memory quarantine store — suitable for laptop demo and unit tests.
 * Swap with a DuckDB or Neo4j-backed implementation for production.
 */
export class MemoryQuarantineStore implements QuarantineStore {
  private readonly cases = new Map<UUID, QuarantineCase>();

  async putCase(c: QuarantineCase): Promise<void> {
    this.cases.set(c.quarantine_case_id, c);
  }

  async getCase(id: UUID): Promise<QuarantineCase | null> {
    return this.cases.get(id) ?? null;
  }

  async listCases(opts?: { status?: QuarantineDisposition; limit?: number }): Promise<QuarantineCase[]> {
    const arr = [...this.cases.values()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    const filtered = opts?.status ? arr.filter((x) => x.status === opts.status) : arr;
    return filtered.slice(0, opts?.limit ?? 200);
  }

  async updateStatus(id: UUID, status: QuarantineDisposition): Promise<void> {
    const c = this.cases.get(id);
    if (!c) return;
    this.cases.set(id, { ...c, status });
  }
}
