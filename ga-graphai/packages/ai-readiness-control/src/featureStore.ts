import { FeatureEntry, FeatureRetrievalResult } from "./types.js";

export class FeatureStore {
  private readonly store = new Map<string, FeatureEntry>();

  upsert(entry: FeatureEntry): void {
    this.store.set(entry.key, entry);
  }

  get(key: string): FeatureRetrievalResult | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const expiresAt = new Date(entry.createdAt).getTime() + entry.ttlMinutes * 60 * 1000;
    if (Date.now() > expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return {
      value: entry.value,
      version: entry.version,
      lineage: entry.lineage,
      sourceArtifacts: entry.sourceArtifacts,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  pendingExpiry(withinMinutes: number): FeatureEntry[] {
    const cutoff = Date.now() + withinMinutes * 60 * 1000;
    return Array.from(this.store.values()).filter((entry) => {
      const expiresAt = new Date(entry.createdAt).getTime() + entry.ttlMinutes * 60 * 1000;
      return expiresAt <= cutoff;
    });
  }

  async backfill<TInput>(job: {
    id: string;
    inputs: TInput[];
    compute: (input: TInput) => Promise<FeatureEntry>;
    allowOverwrite?: boolean;
  }): Promise<FeatureEntry[]> {
    const results: FeatureEntry[] = [];
    for (const input of job.inputs) {
      const computed = await job.compute(input);
      const existing = this.store.get(computed.key);
      if (existing && !job.allowOverwrite) {
        continue;
      }
      this.upsert(computed);
      results.push(computed);
    }
    return results;
  }
}
