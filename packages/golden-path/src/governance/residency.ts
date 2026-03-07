import { AuditTrailEntry, ClassificationTag } from "../types.js";

export function enforceResidency(
  tag: ClassificationTag,
  allowedRegions: string[],
  auditTrail: AuditTrailEntry[]
): void {
  if (!allowedRegions.includes(tag.residencyRegion)) {
    auditTrail.push({
      timestamp: new Date().toISOString(),
      message: "Residency violation detected",
      context: { residencyRegion: tag.residencyRegion, allowedRegions },
    });
    throw new Error(`Residency ${tag.residencyRegion} is not permitted`);
  }
}
