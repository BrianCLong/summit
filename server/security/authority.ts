export async function ensureAuthority(ctx: any, { action, caseId }: { action: string; caseId?: string }) {
  if (!ctx?.policy) throw new Error("Policy missing");
  if (action === "AI_CALL" && ctx.policy.cloudAllowed !== true) return; // local provider will be chosen
  // Extend: check role, warrant, license/authority tags per case
}
