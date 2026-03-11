// Internal Data Models (Simulated)
export interface InternalRiskData {
  personaId: string;
  accountHandle: string;
  campaignId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  narrativeType: string;
  incidents: { id: string; timestamp: string; details: string }[];
}

export interface InternalGovernanceData {
  decisionId: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  approvalTimeMs: number;
  category: string;
  codeDetails: string;
  reviewerId: string;
}

export interface InternalAutomationData {
  executionId: string;
  subjectId: string;
  actionClass: string;
  requiredCouncilApproval: boolean;
  timestamp: string;
}

// External Trust Summary Models
export interface TrustRiskSummary {
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  highRiskAlertsHandled: number;
  topNarrativeRisks: string[];
}

export interface GovernanceSummary {
  tier2And3Decisions: number;
  averageApprovalTimeMs: number;
  majorCategories: string[];
}

export interface AutomationSafetySummary {
  actionsByClass: Record<string, number>;
  councilApprovalsRequired: number;
  autoApprovals: number;
}

// Redaction Layer
export function redactRiskData(internalDataList: InternalRiskData[]): TrustRiskSummary {
  const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  let highRiskHandled = 0;
  const narrativeCounts: Record<string, number> = {};

  for (const data of internalDataList) {
    distribution[data.riskLevel]++;

    if (data.riskLevel === 'HIGH' && data.incidents.length > 0) {
      highRiskHandled++;
    }

    narrativeCounts[data.narrativeType] = (narrativeCounts[data.narrativeType] || 0) + 1;
  }

  const topNarrativeRisks = Object.entries(narrativeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);

  return {
    riskDistribution: distribution,
    highRiskAlertsHandled: highRiskHandled,
    topNarrativeRisks
  };
}

export function redactGovernanceData(internalDataList: InternalGovernanceData[]): GovernanceSummary {
  let tier2And3Count = 0;
  let totalApprovalTime = 0;
  let validApprovalCount = 0;
  const categories = new Set<string>();

  for (const data of internalDataList) {
    if (data.tier === 'Tier 2' || data.tier === 'Tier 3') {
      tier2And3Count++;
    }

    if (data.approvalTimeMs > 0) {
      totalApprovalTime += data.approvalTimeMs;
      validApprovalCount++;
    }

    categories.add(data.category);
  }

  const averageApprovalTimeMs = validApprovalCount > 0 ? totalApprovalTime / validApprovalCount : 0;

  return {
    tier2And3Decisions: tier2And3Count,
    averageApprovalTimeMs,
    majorCategories: Array.from(categories)
  };
}

export function redactAutomationData(internalDataList: InternalAutomationData[]): AutomationSafetySummary {
  const actionsByClass: Record<string, number> = {};
  let councilApprovalsRequired = 0;
  let autoApprovals = 0;

  for (const data of internalDataList) {
    actionsByClass[data.actionClass] = (actionsByClass[data.actionClass] || 0) + 1;

    if (data.requiredCouncilApproval) {
      councilApprovalsRequired++;
    } else {
      autoApprovals++;
    }
  }

  return {
    actionsByClass,
    councilApprovalsRequired,
    autoApprovals
  };
}
