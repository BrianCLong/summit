import type { WriteSet } from "../types.js";

export interface AccessContext {
  actorId: string;
  allowedTags: string[];
}

export function canAccess(writeSet: WriteSet, ctx: AccessContext): boolean {
  if (writeSet.policyTags.length === 0) return true;
  return writeSet.policyTags.every((tag) => ctx.allowedTags.includes(tag));
}
