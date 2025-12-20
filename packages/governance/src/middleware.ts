import type { Invariant, InvariantContext } from "./invariants";
import { evaluateInvariants } from "./invariants";

export type GovernanceDecision =
  | { allowed: true; warnings: any[] }
  | { allowed: false; violations: any[] };

export async function governExecution(
  invariants: Invariant[],
  ctx: InvariantContext,
  record: (decision: GovernanceDecision, ctx: InvariantContext) => Promise<void> | void
): Promise<GovernanceDecision> {
  const { ok, violations } = await evaluateInvariants(invariants, ctx);

  const decision: GovernanceDecision = ok
    ? { allowed: true, warnings: violations.filter((v) => v.severity === "warn") }
    : { allowed: false, violations };

  await record(decision, ctx);

  return decision;
}
