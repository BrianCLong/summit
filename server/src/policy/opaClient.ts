import fetch from 'node-fetch';

const OPA_URL = process.env.OPA_URL || 'http://opa:8181/v1/data';

export type OpaInput = {
  action: string;
  tenant?: string;
  user?: { id?: string; roles?: string[] };
  meta?: { region?: string; residency?: string };
  labels?: string[];
};

export type OpaClientOptions = {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  deadlineMs?: number;
};

export async function opaAllow(
  path: string,
  input: OpaInput,
  opts: OpaClientOptions = {},
): Promise<{ allow: boolean; reason?: string }> {
  const url = `${OPA_URL}/${path.replace(/^\//, '')}`;
  const retries = opts.retries ?? 2;
  const baseBackoff = opts.backoffMs ?? 50;
  const timeoutMs = opts.timeoutMs ?? 500;
  const deadline = opts.deadlineMs ? Date.now() + opts.deadlineMs : undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const attemptDeadline = deadline ? deadline - Date.now() : timeoutMs;
    const perAttemptTimeout = Math.max(50, Math.min(timeoutMs, attemptDeadline));

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), perAttemptTimeout);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, baseBackoff * (attempt + 1)));
          continue;
        }
        throw new Error(`OPA ${res.status}`);
      }

      const j = await res.json();
      const allow = !!(j.result?.allow ?? j.result === true);
      const reason = j.result?.reason || undefined;
      return { allow, reason };
    } catch (e: any) {
      const isTimeout = e?.name === 'AbortError';
      const isRetryable = isTimeout || e?.message?.startsWith('OPA 5');
      if (isRetryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, baseBackoff * (attempt + 1)));
        continue;
      }
      if (process.env.OPA_FAIL_OPEN === 'true')
        return { allow: true, reason: 'fail-open' };
      return { allow: false, reason: e?.message || 'opa-error' };
    }
  }

  return { allow: false, reason: 'opa-unreachable' };
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
