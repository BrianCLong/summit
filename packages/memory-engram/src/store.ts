export type MemoryPayload =
  | { kind: 'text'; value: string }
  | { kind: 'json'; value: Record<string, unknown> };

export interface MemoryProvenance {
  source: string;
  recordedAt: string;
  actor?: string;
  confidence?: number;
}

export interface EngramRecord {
  id: string;
  tenantId: string;
  canonicalKey: string;
  hashHeads: number[][];
  payload: MemoryPayload;
  embedding?: number[];
  provenance: MemoryProvenance;
  policyTags: string[];
  ttlSeconds?: number;
}

export interface EngramStoreQueryOptions {
  limit?: number;
  tenantId?: string;
}

export interface EngramStore {
  getMany(hashHeads: number[][], options?: EngramStoreQueryOptions): Promise<EngramRecord[]>;
  put(record: EngramRecord): Promise<void>;
  prefetch(hashHeads: number[][], options?: EngramStoreQueryOptions): Promise<void>;
}

export class InMemoryEngramStore implements EngramStore {
  private readonly records: EngramRecord[] = [];

  async getMany(hashHeads: number[][], options: EngramStoreQueryOptions = {}): Promise<EngramRecord[]> {
    const limit = options.limit ?? 50;
    const tenantId = options.tenantId;

    const filtered = this.records.filter((record) => {
      if (tenantId && record.tenantId !== tenantId) {
        return false;
      }
      return hashHeads.some((headHashes, headIndex) => {
        const recordHashes = record.hashHeads[headIndex] ?? [];
        const recordSet = new Set(recordHashes);
        return headHashes.some((hash) => recordSet.has(hash));
      });
    });

    return filtered.slice(0, limit);
  }

  async put(record: EngramRecord): Promise<void> {
    this.records.push(record);
  }

  async prefetch(): Promise<void> {
    return;
  }
}
