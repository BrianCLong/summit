import { ApprovalRequirement, IntakeRequest, RiskTier, RoutingAssignment } from "./types";

export class WorkflowRouter {
  route(
    intake: IntakeRequest,
    requirement: ApprovalRequirement,
    riskTier: RiskTier
  ): RoutingAssignment[] {
    const routing: RoutingAssignment[] = [
      {
        team: "Finance",
        reason: "Budget check, chargeback/showback, PO issuance",
        slaHours: 48,
      },
      {
        team: "Procurement",
        reason: "Preferred vendor verification and overlap policy enforcement",
        slaHours: 24,
      },
    ];

    if (requirement.requiresSecurity) {
      routing.push({
        team: "Security",
        reason: "VRM assessment and data handling verification",
        slaHours: riskTier === 0 ? 24 : 48,
      });
    }

    if (requirement.requiresLegal) {
      routing.push({
        team: "Legal",
        reason: "MSA/DPA, clause library alignment, signature authority",
        slaHours: 48,
      });
    }

    if (requirement.requiresIT) {
      routing.push({
        team: "IT",
        reason: "SSO setup, least-privilege groups, integration sizing",
        slaHours: 24,
      });
    }

    if (requirement.requiresExecutiveSignoff) {
      routing.push({
        team: "Executive",
        reason: "Executive approval for Tier 0/high spend",
        slaHours: 72,
      });
    }

    if (!intake.preferredVendor) {
      routing.push({
        team: "Procurement",
        reason: "Non-preferred vendor: require exception with expiry and rationale",
        slaHours: 24,
      });
    }

    return routing;
  }
}
