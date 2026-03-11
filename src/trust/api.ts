import {
  InternalRiskData,
  InternalGovernanceData,
  InternalAutomationData,
  redactRiskData,
  redactGovernanceData,
  redactAutomationData
} from "./summary_model.js";

// Simulated Governance Configuration
const governanceConfig = {
  allowAutomationDetails: true,
  allowGovernanceDetails: true,
};

// Simulated mock data
const mockInternalRiskData: InternalRiskData[] = [
  { personaId: "user123", accountHandle: "@user123", campaignId: "campA", riskLevel: "HIGH", narrativeType: "disinformation", incidents: [{ id: "inc1", timestamp: "2024-01-01", details: "foo" }] },
  { personaId: "user456", accountHandle: "@user456", campaignId: "campB", riskLevel: "MEDIUM", narrativeType: "disinformation", incidents: [] },
  { personaId: "user789", accountHandle: "@user789", campaignId: "campC", riskLevel: "LOW", narrativeType: "spam", incidents: [] },
];

const mockInternalGovernanceData: InternalGovernanceData[] = [
  { decisionId: "d1", tier: "Tier 1", approvalTimeMs: 1000, category: "ontology", codeDetails: "function A() {}", reviewerId: "rev1" },
  { decisionId: "d2", tier: "Tier 3", approvalTimeMs: 5000, category: "exports", codeDetails: "function B() {}", reviewerId: "rev2" },
];

const mockInternalAutomationData: InternalAutomationData[] = [
  { executionId: "exec1", subjectId: "sub1", actionClass: "watchlist", requiredCouncilApproval: true, timestamp: "2024-01-01" },
  { executionId: "exec2", subjectId: "sub2", actionClass: "report", requiredCouncilApproval: false, timestamp: "2024-01-02" },
];

export function trustAuthMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  // Simple check for the required trust_read scope
  if (token !== "valid-trust-read-token") {
    return res.status(403).json({ error: "Insufficient scope" });
  }

  next();
}

export async function getRiskSummary(req: any, res: any) {
  const summary = redactRiskData(mockInternalRiskData);
  res.json(summary);
}

export async function getGovernanceSummary(req: any, res: any) {
  if (!governanceConfig.allowGovernanceDetails) {
    return res.json({ message: "Governance details are restricted by Council policy." });
  }
  const summary = redactGovernanceData(mockInternalGovernanceData);
  res.json(summary);
}

export async function getAutomationSummary(req: any, res: any) {
  if (!governanceConfig.allowAutomationDetails) {
    return res.json({ message: "Automation details are restricted by Council policy." });
  }
  const summary = redactAutomationData(mockInternalAutomationData);
  res.json(summary);
}

// In a real Express setup, you would bind these like:
// router.get('/trust/v1/risk-summary', trustAuthMiddleware, getRiskSummary);
// router.get('/trust/v1/governance-summary', trustAuthMiddleware, getGovernanceSummary);
// router.get('/trust/v1/automation-summary', trustAuthMiddleware, getAutomationSummary);
