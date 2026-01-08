import { PlaybookAction, TrustControl } from "./types";

export interface GovernanceInputs {
  dataResidency: "us" | "eu" | "global";
  approvedRegions: string[];
  integrationAllowlists: string[];
  requestedIntegration?: string;
  riskyActionRequested?: string;
}

export function enforceGovernance(input: GovernanceInputs): {
  controls: TrustControl[];
  approvals: PlaybookAction[];
} {
  const controls: TrustControl[] = [
    {
      control: "audit-log",
      enforced: true,
      evidence: "Audit logs enabled for admin and config changes",
    },
    {
      control: "access-review-export",
      enforced: true,
      evidence: "Access review exports available with chain-of-custody",
    },
    {
      control: "data-residency",
      enforced: input.approvedRegions.includes(input.dataResidency),
      evidence: `Data residency enforced for ${input.dataResidency}`,
    },
  ];

  if (
    input.requestedIntegration &&
    !input.integrationAllowlists.includes(input.requestedIntegration)
  ) {
    controls.push({
      control: "integration-governance",
      enforced: false,
      evidence: `Integration ${input.requestedIntegration} pending approval`,
    });
  } else {
    controls.push({
      control: "integration-governance",
      enforced: true,
      evidence: "Integrations limited to allowlist",
    });
  }

  const approvals: PlaybookAction[] = [];
  if (input.riskyActionRequested) {
    approvals.push({
      id: `approval-${input.riskyActionRequested}`,
      category: "governance",
      description: `Approval required for ${input.riskyActionRequested}`,
      requiresApproval: true,
    });
  }

  return { controls, approvals };
}
