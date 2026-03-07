import { DecisionResource, DecisionStatus } from "../crd/Decision.js";
import { resolveEvidence, verifyLineage } from "./evidenceController.js";
import { evaluateAdmission } from "../admission/evaluateAdmission.js";
import { recordDecisionAdmission } from "../observability/metrics.js";

export async function reconcileDecision(
  resource: DecisionResource
): Promise<DecisionStatus> {
  const startTime = Date.now();
  const evidence = await resolveEvidence(resource.spec.evidenceIds || []);
  const lineageOk = await verifyLineage(evidence);

  let trustScore = lineageOk ? 80 : 0;
  let riskScore = resource.spec.riskTier === "high" ? 90 : resource.spec.riskTier === "medium" ? 50 : 10;

  const admissionResult = await evaluateAdmission(resource, { human: false });

  const allowed = admissionResult.allowed && lineageOk;
  const phase = allowed ? "Admitted" : "Blocked";

  const status: DecisionStatus = {
    phase,
    allowed,
    trustScore,
    riskScore,
    conditions: [
      {
        type: "EvidenceResolved",
        status: evidence.length > 0 ? "True" : "False",
        reason: evidence.length > 0 ? "Resolved successfully" : "No evidence provided",
      },
      {
        type: "LineageVerified",
        status: lineageOk ? "True" : "False",
        reason: lineageOk ? "Lineage verified" : "Lineage check failed",
      },
      ...admissionResult.conditions
    ],
  };

  recordDecisionAdmission({
    profile: resource.spec.policyProfile,
    outcome: status.allowed ? "allow" : "deny",
    durationMs: Date.now() - startTime,
  });

  return status;
}
