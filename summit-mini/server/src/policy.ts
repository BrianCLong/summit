import { nanoid } from "nanoid";
import type { PolicyDecisionV01 } from "./types.js";

// Simple built-in policy (replace later with OPA)
// - deny if looks like SSN
// - allow_with_obligations if looks like email
export function evaluatePolicy(params: { content: string; receiptRef: string }): PolicyDecisionV01 {
  const { content, receiptRef } = params;
  const ts = new Date().toISOString();

  const reasons: string[] = [];
  const obligations: PolicyDecisionV01["obligations"] = [];

  const hasSSN = /\b\d{3}-\d{2}-\d{4}\b/.test(content);
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(content);

  if (hasSSN) {
    reasons.push("Detected possible SSN pattern.");
    return {
      schemaVersion: "urn:summit:PolicyDecision:v0.1",
      decisionId: `pd_${nanoid(10)}`,
      ts,
      policy: { id: "builtin:minipolicy", version: "0.1.0" },
      result: "deny",
      reasons,
      obligations: [],
      receiptRef
    };
  }

  if (hasEmail) {
    reasons.push("Detected email-like identifier.");
    obligations.push({ type: "redact", params: { fields: ["email"] } });
    return {
      schemaVersion: "urn:summit:PolicyDecision:v0.1",
      decisionId: `pd_${nanoid(10)}`,
      ts,
      policy: { id: "builtin:minipolicy", version: "0.1.0" },
      result: "allow_with_obligations",
      reasons,
      obligations,
      receiptRef
    };
  }

  return {
    schemaVersion: "urn:summit:PolicyDecision:v0.1",
    decisionId: `pd_${nanoid(10)}`,
    ts,
    policy: { id: "builtin:minipolicy", version: "0.1.0" },
    result: "allow",
    reasons: ["No sensitive patterns detected by builtin policy."],
    obligations: [],
    receiptRef
  };
}
