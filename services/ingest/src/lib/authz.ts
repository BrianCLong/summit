// @ts-nocheck
import { createHash, randomUUID } from 'crypto';

const DECISION_URL =
  process.env.OPA_DECISION_URL ||
  'http://localhost:8181/v1/data/policy/authz/abac/decision';

function hashSubject(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 8);
}

export async function checkAuthz(input: {
  subject: {
    id: string;
    roles: string[];
    tenant: string;
    clearance: string;
    mfa: string;
  };
  resource: {
    type: string;
    id: string;
    tenant: string;
    classification: string;
  };
  action: string;
  context: {
    env: string;
    request_ip: string | undefined;
    time: string;
    risk: string;
    reason: string;
    warrant_id?: string;
  };
}): Promise<{ allow: boolean; deny?: string[] }> {
  const traceId = randomUUID();

  const res = await fetch(DECISION_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trace-id': traceId,
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    throw new Error(`OPA returned status ${res.status}`);
  }

  const body = (await res.json()) as {
    result: { allow: boolean; deny?: string[] };
  };

  if (!body.result) {
    throw new Error('OPA decision missing');
  }

  console.info(
    JSON.stringify({
      traceId,
      event: 'authz_decision',
      subject: hashSubject(input.subject.id),
      action: input.action,
      tenant: input.resource.tenant,
      allow: body.result.allow,
      deny: body.result.deny,
    }),
  );

  return body.result;
}
