import { applyPipeline, canonicalSignature, EmbeddingConfig } from './embeddingConfig.js';

type Metadata = Record<string, unknown> | undefined;

export interface EmbeddingRecord {
  itemId: string;
  version: string;
  config: EmbeddingConfig;
  vector: number[];
  metadata?: Metadata;
}

export interface CreateEmbeddingRecordParams {
  itemId: string;
  version: string;
  config: EmbeddingConfig;
  vector: number[];
  metadata?: Metadata;
}

export const createEmbeddingRecord = (
  params: CreateEmbeddingRecordParams,
): EmbeddingRecord => ({
  itemId: params.itemId,
  version: params.version,
  config: params.config,
  vector: applyPipeline(params.vector, params.config),
  metadata: params.metadata,
});

const vectorsEqual = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export class EmbeddingStore {
  private readonly store = new Map<string, Map<string, EmbeddingRecord>>();

  upsert(record: EmbeddingRecord): EmbeddingRecord {
    if (!this.store.has(record.itemId)) {
      this.store.set(record.itemId, new Map());
    }
    const versions = this.store.get(record.itemId)!;
    const existing = versions.get(record.version);
    if (existing) {
      if (
        canonicalSignature(existing.config) !== canonicalSignature(record.config) ||
        !vectorsEqual(existing.vector, record.vector)
      ) {
        throw new Error(
          `Conflicting embedding for ${record.itemId} @ ${record.version}: reproducibility violated`,
        );
      }
      return existing;
    }
    if (versions.size) {
      const [first] = versions.values();
      if (first.vector.length !== record.vector.length) {
        throw new Error(
          `Dimension mismatch for ${record.itemId}: expected ${first.vector.length}, received ${record.vector.length}`,
        );
      }
    }
    versions.set(record.version, { ...record, vector: [...record.vector] });
    return versions.get(record.version)!;
  }

  get(itemId: string, version: string): EmbeddingRecord {
    const versions = this.store.get(itemId);
    const record = versions?.get(version);
    if (!record) {
      throw new Error(`Embedding not found for ${itemId} @ ${version}`);
    }
    return record;
  }

  versionsFor(itemId: string): string[] | undefined {
    const versions = this.store.get(itemId);
    if (!versions) return undefined;
    return [...versions.keys()].sort();
  }

  exportSnapshot(): string {
    const snapshot: Record<string, Record<string, EmbeddingRecord>> = {};
    const sortedIds = [...this.store.keys()].sort();
    for (const id of sortedIds) {
      const versions = this.store.get(id)!;
      snapshot[id] = {};
      for (const version of [...versions.keys()].sort()) {
        snapshot[id][version] = versions.get(version)!;
      }
    }
    return JSON.stringify(snapshot, null, 2);
  }

  importSnapshot(snapshot: string): void {
    const decoded = JSON.parse(snapshot) as Record<string, Record<string, EmbeddingRecord>>;
    this.store.clear();
    for (const id of Object.keys(decoded).sort()) {
      const versionMap = new Map<string, EmbeddingRecord>();
      for (const version of Object.keys(decoded[id]).sort()) {
        const record = decoded[id][version];
        versionMap.set(version, {
          ...record,
          vector: [...record.vector],
          config: record.config,
        });
      }
      this.store.set(id, versionMap);
    }
  }

  recordsForVersion(version: string): Map<string, EmbeddingRecord> {
    const result = new Map<string, EmbeddingRecord>();
    for (const [id, versions] of this.store.entries()) {
      const record = versions.get(version);
      if (record) {
        result.set(id, record);
      }
    }
    return new Map([...result.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }
}
