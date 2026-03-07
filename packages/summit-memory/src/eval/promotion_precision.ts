import type { WriteSet } from "../types.js";

export function promotionPrecision(
  promoted: WriteSet[],
  laterStillValidIds: string[]
): number {
  if (promoted.length === 0) return 1;
  const tp = promoted.filter((w) => laterStillValidIds.includes(w.writeSetId)).length;
  return tp / promoted.length;
}
