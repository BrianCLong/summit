export type PolicyDecision = { allow: boolean; reason: string; evidenceId: string };

export function enforceAction(policyHash: string, action: string, enabled: boolean = false): PolicyDecision {
  const evidenceId = process.env.EVIDENCE_ID ?? `EVID-POLICY-${new Date().toISOString().split('T')[0]}-runtime`;

  if (!enabled) {
      return { allow: true, reason: "POLICY_DISABLED", evidenceId };
  }

  // Deny by default if enabled
  return { allow: false, reason: `DENY_DEFAULT:${action}`, evidenceId };
}
