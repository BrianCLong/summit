import type { PromotionPolicy, WriteSet } from "../types.js";
import { scoreMemory } from "./scoreMemory.js";

export function promote(writeSet: WriteSet, policy: PromotionPolicy): WriteSet {
  const scored = scoreMemory(writeSet, policy);
  if (!scored.eligible) return writeSet;

  return {
    ...writeSet,
    promotionState: policy.promotionTarget
  };
}
