import fetch from 'node-fetch';

const OPA_URL = process.env.OPA_URL || 'http://opa:8181/v1/data';

export type OpaInput = {
  action: string;
  tenant?: string;
  user?: { id?: string; roles?: string[] };
  meta?: { region?: string; residency?: string };
  labels?: string[];
};

export async function opaAllow(
  path: string,
  input: OpaInput,
): Promise<{ allow: boolean; reason?: string }> {
  const url = `${OPA_URL}/${path.replace(/^\//, '')}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) throw new Error(`OPA ${res.status}`);
    const j = await res.json();
    const allow = !!(j.result?.allow ?? j.result === true);
    const reason = j.result?.reason || undefined;
    return { allow, reason };
  } catch (e: any) {
    if (process.env.OPA_FAIL_OPEN === 'true')
      return { allow: true, reason: 'fail-open' };
    return { allow: false, reason: e.message };
  }
}

export async function checkResidency(meta: {
  region?: string;
  residency?: string;
}) {
  const decision = await opaAllow('maestro/residency', {
    action: 'residency',
    meta,
  });
  return decision;
}
