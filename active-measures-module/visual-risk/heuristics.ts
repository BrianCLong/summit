export function visibilityGap(connectivity: "normal" | "throttled" | "shutdown", localEvidenceCount: number): boolean {
  return connectivity !== "normal" && localEvidenceCount < 3;
}
