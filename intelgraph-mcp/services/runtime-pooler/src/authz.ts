export interface PolicyContext {
  action: 'allocate' | 'invoke' | 'stream';
  tenant?: string;
  toolClass?: string;
  capabilityScopes?: string[];
  purpose?: string;
  destination?: string;
}

export interface PolicyDecision {
  allow: boolean;
  raw?: unknown;
}

const OPA_URL = process.env.OPA_URL;

export async function authorize(
  authorization: unknown,
  context: PolicyContext,
): Promise<PolicyDecision> {
  if (!authorization) throw new Error('unauthorized');
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
    throw new Error(`policy-eval-error:${res.status}`);
  }

  const body = (await res.json()) as { result?: unknown };
  const allow = resolveDecision(body.result);
  if (!allow) {
    throw new Error('forbidden');
  }
  return { allow, raw: body.result };
}

function resolveDecision(result: unknown): boolean {
  if (typeof result === 'boolean') return result;
  if (result && typeof result === 'object' && 'allow' in result) {
    return Boolean((result as { allow?: boolean }).allow);
  }
  return false;
}
