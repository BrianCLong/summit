import { stableHash } from "../canonical/canonicalizer.js";

export interface BundleObject {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  references?: string[];
}

export interface RoundtripReport {
  ok: boolean;
  mismatches: string[];
}

export interface RoundtripOptions {
  expectedCount?: number;
}

export function verifyRoundtrip(
  bundle: BundleObject[],
  options: RoundtripOptions = {}
): RoundtripReport {
  const mismatches: string[] = [];
  const ids = new Set(bundle.map((item) => item.id));
  if (options.expectedCount !== undefined && bundle.length !== options.expectedCount) {
    mismatches.push(`Expected ${options.expectedCount} objects but found ${bundle.length}`);
  }

  bundle.forEach((item) => {
    const hash = stableHash(item.payload);
    if (!item.payload.__hash) {
      mismatches.push(`Missing hash for ${item.id}`);
    } else if (item.payload.__hash !== hash) {
      mismatches.push(`Hash mismatch for ${item.id}`);
    }
    if (item.references) {
      const missingRefs = item.references.filter((ref) => !ids.has(ref));
      if (missingRefs.length > 0) {
        mismatches.push(`Missing references for ${item.id}: ${missingRefs.join(", ")}`);
      }
    }
  });

  return { ok: mismatches.length === 0, mismatches: mismatches.sort() };
}
