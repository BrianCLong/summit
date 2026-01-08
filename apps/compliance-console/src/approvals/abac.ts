import { ApprovalRequest, Decision, UserContext } from "./types";

/**
 * Evaluate ABAC rules for a given approval decision.
 * Ensures tenant/region affinity, sensitivity clearance, and dual-control compliance.
 */
export function abacDecision(
  user: UserContext,
  request: ApprovalRequest,
  decision: Decision
): { allowed: boolean; reason?: string } {
  const isTenantAllowed = user.tenants.includes(request.attributes.tenant);
  if (!isTenantAllowed) {
    return { allowed: false, reason: "User not assigned to tenant" };
  }

  if (user.region !== request.attributes.region) {
    return { allowed: false, reason: "Region residency mismatch" };
  }

  const requiresSenior = request.attributes.sensitivity === "restricted";
  if (requiresSenior && user.clearance !== "l3") {
    return { allowed: false, reason: "Restricted data requires L3 clearance" };
  }

  if (request.dualControl && decision === "approve") {
    const hasComplianceOfficerApproval = request.approvals.some(
      (a) => a.decision === "approved" && a.role === "compliance_officer"
    );
    if (user.role !== "compliance_officer" && !hasComplianceOfficerApproval) {
      return {
        allowed: false,
        reason: "Dual control requires compliance officer approval",
      };
    }
  }

  return { allowed: true };
}
