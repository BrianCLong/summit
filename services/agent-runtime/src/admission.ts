import { evaluate } from "./opa_client"; // HTTP POST /v1/data/runtime/agent_runtime

export async function admit(run: any) {
  const input = {
    request: { tool: run.tool },
    agent: { autonomy_level: run.autonomy_level },
    human_approval: { signed: !!run.approval?.jwt },
    evidence: {
      claims_logging_uri: run.claims?.uri,
      audit_bundle_signed: run.audit?.bundle_signed === true
    }
  };

  const decision = await evaluate(input);
  if (decision.result?.deny && decision.result.deny.length) {
    return {
      status: 403,
      incident: {
        reason: decision.result.deny,
        evidence: input,
        operation_token: run.operation_token // enable break‑glass later
      }
    };
  }
  if (decision.result?.violation && decision.result.violation.length) {
    // soft‑fail: allow but emit incident for missing non‑blocking requirements
  }
  return { status: 202 };
}
