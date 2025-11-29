import { request } from 'undici';
import type {
  DisclosurePackResource,
  PolicyDecision,
  Subject,
} from './types.js';

const OPA_URL = process.env.OPA_URL ?? 'http://localhost:8181';

export async function evaluateDisclosureExport(
  subject: Subject,
  resource: DisclosurePackResource,
): Promise<PolicyDecision> {
  const payload = {
    input: {
      action: 'disclosure:export',
      subject,
      resource,
    },
  };

  try {
    const res = await request(
      `${OPA_URL}/v1/data/companyos/authz/disclosure_export/decision`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (res.statusCode >= 400) {
      throw new Error(`opa status ${res.statusCode}`);
    }

    const decision = (await res.body.json()) as { result?: PolicyDecision };

    if (!decision?.result) {
      throw new Error(`opa missing result (${res.statusCode})`);
    }

    return decision.result;
  } catch (error) {
    console.warn(
      '[authz] opa decision error',
      (error as Error).message ?? 'unknown error',
    );
    return { allow: false, reason: 'authorization_error' };
  }
}
