import { createHash } from 'node:crypto';
import { stableStringify } from './utils/stableJson';

export interface PolicyContext {
  action: 'allocate' | 'invoke' | 'stream';
  tenant?: string;
  toolClass?: string;
  capabilityScopes?: string[];
  purpose?: string;
  destination?: string;
}

export type PolicyReceipt = {
  hash: string;
  inputHash: string;
  decisionHash: string;
  version: 'v1';
};

export interface PolicyDecision {
  allow: boolean;
  raw?: unknown;
  receipt?: PolicyReceipt;
}

const OPA_URL = process.env.OPA_URL;

export async function authorize(
  authorization: unknown,
  context: PolicyContext,
): Promise<PolicyDecision> {
  if (!authorization) {
    throw new Error('Authorization header is missing. Please provide a valid token. If you are using the CLI, check your credentials via "summitctl auth status".');
  }
  if (!OPA_URL) {
    return { allow: true };
  }

  const payload = {
    input: {
      action: context.action,
      tenant: context.tenant ?? 'unknown',
      tool: context.toolClass,
      capability_scopes: context.capabilityScopes ?? [],
      purpose: context.purpose ?? 'ops',
      destination: context.destination,
    },
  };

  const res = await fetch(`${OPA_URL}/v1/data/intelgraph/mcp/allow`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Policy evaluation failed with status ${res.status}. This may be a temporary service issue. Please retry in a few moments.`);
  }

  const body = (await res.json()) as { result?: unknown };
  const allow = resolveDecision(body.result);
  if (!allow) {
    throw new Error(`Access forbidden for action "${context.action}" on tool "${context.toolClass}". Ensure your account has the required "${context.capabilityScopes?.join(', ') || 'basic'}" scopes.`);
  }
  const receipt = createPolicyReceipt(payload.input, body.result);
  emitPolicyDecision(context, receipt);
  return { allow, raw: body.result, receipt };
}

function resolveDecision(result: unknown): boolean {
  if (typeof result === 'boolean') return result;
  if (result && typeof result === 'object' && 'allow' in result) {
    return Boolean((result as { allow?: boolean }).allow);
  }
  return false;
}

function createPolicyReceipt(input: unknown, decision: unknown): PolicyReceipt {
  const inputHash = createHash('sha256')
    .update(stableStringify(input))
    .digest('hex');
  const decisionHash = createHash('sha256')
    .update(stableStringify(decision))
    .digest('hex');
  const hash = createHash('sha256')
    .update(`${inputHash}:${decisionHash}`)
    .digest('hex');
  return { hash, inputHash, decisionHash, version: 'v1' };
}

function emitPolicyDecision(context: PolicyContext, receipt: PolicyReceipt) {
  console.info(
    JSON.stringify({
      event: 'policy.decision',
      action: context.action,
      tenant: context.tenant ?? 'unknown',
      tool: context.toolClass,
      receipt,
    }),
  );
}
