export type Invariant = {
  id: string;
  description: string;
  severity: "warn" | "block";
  check: (ctx: InvariantContext) => Promise<boolean> | boolean;
};

export type InvariantViolation = {
  invariantId: string;
  description: string;
  severity: "warn" | "block";
  timestamp: string;
  contextRef?: string;
};

export type InvariantContext = {
  actorId?: string;
  action?: string;
  resource?: string;
  inputs?: unknown;
  provenanceRefs?: string[];
};

export async function evaluateInvariants(
  invariants: Invariant[],
  ctx: InvariantContext
): Promise<{ ok: boolean; violations: InvariantViolation[] }> {
  const violations: InvariantViolation[] = [];

  for (const inv of invariants) {
    let holds = false;
    try {
      holds = await inv.check(ctx);
    } catch {
      holds = false;
    }
    if (!holds) {
      violations.push({
        invariantId: inv.id,
        description: inv.description,
        severity: inv.severity,
        timestamp: new Date().toISOString(),
        contextRef: ctx.resource,
      });
    }
  }

  const ok = !violations.some((v) => v.severity === "block");
  return { ok, violations };
}
