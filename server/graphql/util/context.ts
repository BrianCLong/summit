export function getCtx(ctx: any, caseId: string) {
  // This is a placeholder. In a real application, you would extract
  // tenantId, policy, finops, and secrets from the context object.
  // For now, we'll use dummy values.
  return {
    tenantId: ctx.tenantId || "default-tenant",
    caseId: caseId,
    policy: { cloudAllowed: true, residency: "us" }, // Assuming cloud is allowed for now
    finops: { maxUsdPerCall: 100 },
    secrets: {}
  };
}
