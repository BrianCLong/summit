import type { Trajectory } from "../../agents/self_flow/types.js";

export function assertGrounded(traj: Trajectory): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (traj.claims.some(c => c.docSpans.length === 0)) {
    reasons.push("Claim missing docSpans");
  }
  if (traj.steps.some(s => s.docSpans?.some(d => !d.sha256))) {
    reasons.push("DocSpan missing sha256");
  }
  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}
