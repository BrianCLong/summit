import { v4 as uuidv4 } from 'uuid';
import { evaluate, OpaInput } from './opa_client.js';

export async function admit(run: any) {
  const input: OpaInput = {
    request: { tool: run.tool },
    agent: { autonomy_level: run.autonomy_level },
    human_approval: { signed: !!(run.approval && run.approval.jwt) },
    evidence: {
      audit_bundle_signed: run.audit?.bundle_signed === true,
    },
  };

  if (run.claims?.uri) {
    input.evidence.claims_logging_uri = run.claims.uri;
  }

  const decision = await evaluate(input);

  if (decision.result?.deny && decision.result.deny.length > 0) {
    return {
      allowed: false,
      status: 403,
      incident: {
        reason: decision.result.deny,
        evidence: input,
        operation_token: uuidv4(),
      },
    };
  }

  if (decision.result?.violation && decision.result.violation.length > 0) {
    console.warn('Policy violation:', decision.result.violation);
  }

  return { allowed: true, status: 202 };
}
