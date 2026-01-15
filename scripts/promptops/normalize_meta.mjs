import { stableStringify } from "./_lib.mjs";

export function normalizeMeta(meta) {
  // Create a normalized copy with stable key order (stableStringify handles that),
  // and remove any fields that should not influence fingerprint if you later add them.
  // For now: include everything deterministically.
  const json = stableStringify(meta);
  return JSON.parse(json);
}
