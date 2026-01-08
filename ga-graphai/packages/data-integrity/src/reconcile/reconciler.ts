import { stableHash } from "../canonical/canonicalizer.js";

export interface StoreSnapshot {
  name: string;
  count: number;
  ids: string[];
  checksums?: Record<string, string>;
}

export interface ReconciliationReport {
  scope: string;
  missingInA: string[];
  missingInB: string[];
  checksumMismatches: string[];
  stale: string[];
}

export interface ReconciliationOptions {
  seed?: number;
  sampleSize?: number;
}

export function reconcile(
  scope: string,
  storeA: StoreSnapshot,
  storeB: StoreSnapshot,
  options: ReconciliationOptions = {}
): ReconciliationReport {
  const sampleSize = options.sampleSize ?? 5;
  const seed = options.seed ?? 42;
  const deterministicIds = (ids: string[]) => ids.slice().sort();
  const sample = (ids: string[]): string[] => {
    const sorted = deterministicIds(ids);
    const result: string[] = [];
    let cursor = seed;
    for (let i = 0; i < Math.min(sampleSize, sorted.length); i += 1) {
      cursor = (cursor * 9301 + 49297) % 233280;
      const idx = cursor % sorted.length;
      result.push(sorted[idx]);
    }
    return Array.from(new Set(result)).sort();
  };

  const missingInA = storeB.ids.filter((id) => !storeA.ids.includes(id)).sort();
  const missingInB = storeA.ids.filter((id) => !storeB.ids.includes(id)).sort();

  const checksumMismatches: string[] = [];
  if (storeA.checksums && storeB.checksums) {
    for (const id of Object.keys(storeA.checksums)) {
      if (!storeB.checksums[id]) continue;
      if (storeA.checksums[id] !== storeB.checksums[id]) {
        checksumMismatches.push(id);
      }
    }
  }

  const stale: string[] = [];
  const sampledA = sample(storeA.ids);
  for (const id of sampledA) {
    const hashA = storeA.checksums?.[id] ?? stableHash(id);
    const hashB = storeB.checksums?.[id];
    if (hashB && hashA !== hashB) {
      stale.push(id);
    }
  }

  return {
    scope,
    missingInA,
    missingInB,
    checksumMismatches: checksumMismatches.sort(),
    stale: stale.sort(),
  };
}
