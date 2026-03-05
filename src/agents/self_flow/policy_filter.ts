import type { Trajectory } from "./types.js";

export function checkPolicy(traj: Trajectory): { ok: boolean; reasons: string[] } {
  if (traj.policy.blocked) {
    return { ok: false, reasons: traj.policy.reasons };
  }
  if (traj.policy.piiRisk === "high") {
    return { ok: false, reasons: ["High PII risk"] };
  }
  return { ok: true, reasons: [] };
}
