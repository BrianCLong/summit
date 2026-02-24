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

export class AuthorizationError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly reason:
      | 'missing_authorization'
      | 'policy_unavailable'
      | 'forbidden',
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

const OPA_URL = process.env.OPA_URL;

export async function authorize(
  authorization: unknown,
  context: PolicyContext,
): Promise<PolicyDecision> {
  if (!authorization) {
    throw new AuthorizationError(
      401,
      'Authorization header is missing. Please provide a valid token. If you are using the CLI, check your credentials via "summitctl auth status".',
      'missing_authorization',
    );
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
    throw new AuthorizationError(
      503,
      `Policy evaluation failed with status ${res.status}. This may be a temporary service issue. Please retry in a few moments.`,
      'policy_unavailable',
    );
  }

  const body = (await res.json()) as { result?: unknown };
  const allow = resolveDecision(body.result);
  if (!allow) {
    throw new AuthorizationError(
      403,
      `Access forbidden for action "${context.action}" on tool "${context.toolClass}". Ensure your account has the required "${context.capabilityScopes?.join(', ') || 'basic'}" scopes.`,
      'forbidden',
    );
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
