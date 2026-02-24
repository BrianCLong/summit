import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { ActionReceipt, ToolCallRequest, PolicyDecision, CredentialGrant } from './types.js';

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
}

export function calculateHash(data: any): string {
  const str = JSON.stringify(sortObjectKeys(data));
  return createHash('sha256').update(str).digest('hex');
}

export function generateActionReceipt(
  request: ToolCallRequest,
  decision: PolicyDecision,
  grant: CredentialGrant | null,
  outputs: any | null,
  serverId: string | null
): ActionReceipt {
  const inputsHash = calculateHash(request.inputs);
  const outputsHash = outputs ? calculateHash(outputs) : null;

  // trace_id deterministic for identical inputs
  // We include tenant and actor to ensure isolation in trace identity
  const traceId = calculateHash({
    tenantId: request.tenantId,
    actorId: request.actorId,
    capabilityId: request.capabilityId,
    inputs: request.inputs
  });

  return {
    receipt_id: uuidv4(),
    trace_id: traceId,
    tenant_id: request.tenantId,
    actor_id: request.actorId,
    requested_capability: request.capabilityId,
    selected_server_id: serverId,
    policy_decision_id: decision.decisionId,
    policy_reasons: decision.reasons,
    obligations: decision.obligations,
    credential_grant_id: grant?.grantId ?? null,
    inputs_hash: inputsHash,
    outputs_hash: outputsHash,
    timestamps: {
      created_at: new Date().toISOString()
    }
  };
}
