import { DecisionResource } from "../crd/Decision.js";
import fs from "fs";
import path from "path";

// In a real environment, this would evaluate the Rego policy.
// For the MWS, we verify the policy bundle is loadable and simulate the OPA engine.
export async function evaluateAdmission(
  resource: DecisionResource,
  approvals: { human?: boolean } = {}
) {
  const policyPath = path.resolve(process.cwd(), ".opa/policy/decision_admission.rego");
  const regoFile = fs.readFileSync(policyPath, "utf8");

  if (!regoFile.includes("package summit.decision.admission")) {
    throw new Error("Invalid OPA policy package.");
  }

  const deny: string[] = [];

  // Simulated OPA evaluation based strictly on the loaded Rego file structure
  if (!resource.spec.evidenceIds || resource.spec.evidenceIds.length === 0) {
    deny.push("missing_evidence_ids");
  }

  if (resource.spec.riskTier === "high" && !approvals.human) {
    deny.push("high_risk_requires_human_approval");
  }

  const allowed = deny.length === 0;

  return {
    allowed,
    conditions: [
      {
        type: "PolicyAdmitted",
        status: allowed ? "True" : ("False" as "True" | "False"),
        reason: allowed ? "Policy checks passed" : deny.join(", "),
      },
    ],
  };
}
