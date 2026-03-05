import type { Trajectory } from "./types.js";
import { assertGrounded } from "../../graphrag/trajectory/grounding.js";
import { checkPolicy } from "./policy_filter.js";

export function compileDataset(traj: Trajectory): any {
  const grounded = assertGrounded(traj);
  const policyOk = checkPolicy(traj);
  if (grounded.ok && policyOk.ok) {
    return { valid: true, data: traj };
  }
  return { valid: false };
}
