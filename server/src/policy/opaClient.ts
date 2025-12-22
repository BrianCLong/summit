import fetch from 'node-fetch';
import { createHash } from 'node:crypto';

const OPA_URL = process.env.OPA_URL || 'http://opa:8181/v1/data';
const DEFAULT_TIMEOUT_MS = Number(process.env.OPA_TIMEOUT_MS || 3000);
const DEFAULT_RETRIES = Number(process.env.OPA_RETRIES || 2);
const DEFAULT_BACKOFF_MS = Number(process.env.OPA_BACKOFF_MS || 100);
const DEFAULT_CACHE_TTL_MS = Number(process.env.OPA_CACHE_TTL_MS || 60_000);

export type OpaInput = {
  action: string;
  tenant?: string;
  user?: { id?: string; roles?: string[] };
  resource?: string;
  meta?: { region?: string; residency?: string; [key: string]: unknown };
  labels?: string[];
};

export type OpaDecision = { allow: boolean; reason?: string };

export type OpaOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  cacheTtlMs?: number;
  skipCache?: boolean;
};

type CacheEntry = { expiresAt: number; decision: OpaDecision };

const decisionCache = new Map<string, CacheEntry>();

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map((v) => stableStringify(v)).join(',')}]`;
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((obj as any)[k])}`)
    .join(',');
  return `{${sorted}}`;
}

function buildCacheKey(path: string, input: OpaInput) {
  const normalizedInput = stableStringify(input);
  const hash = createHash('sha256').update(normalizedInput).digest('hex');
  return `${path}|${input.action}|tenant:${input.tenant || 'none'}|user:${
    input.user?.id || 'anonymous'
  }|${hash}`;
}

async function fetchWithTimeout(url: string, body: string, timeoutMs: number, abortController?: AbortController) {
  const controller = abortController ?? new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function executeWithRetry(
  url: string,
  body: string,
  options: Required<OpaOptions>,
): Promise<OpaDecision> {
  let attempt = 0;
  const start = Date.now();
  let lastError: Error | null = null;

  while (attempt <= options.maxRetries) {
    try {
      const res = await fetchWithTimeout(url, body, options.timeoutMs);
      if (!res.ok) throw new Error(`OPA ${res.status}`);
      const j = await res.json();
      const allow = !!(j.result?.allow ?? j.result === true);
      const reason = j.result?.reason || undefined;

      if (process.env.POLICY_DEBUG === '1') {
        console.log(
          JSON.stringify({
            component: 'policy.opa-client',
            decision: allow ? 'allow' : 'deny',
            reason,
            latencyMs: Date.now() - start,
            attempt,
          }),
        );
      }

      return { allow, reason };
    } catch (error: any) {
      lastError = error;
      if (attempt >= options.maxRetries) break;
      const backoff = options.baseBackoffMs * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, backoff));
      attempt += 1;
    }
  }

  if (process.env.OPA_FAIL_OPEN === 'true') {
    return { allow: true, reason: 'fail-open' };
  }

  return { allow: false, reason: lastError?.message || 'opa_error' };
}

export async function opaAllow(
  path: string,
  input: OpaInput,
  options: OpaOptions = {},
): Promise<OpaDecision> {
  const resolved: Required<OpaOptions> = {
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? DEFAULT_RETRIES,
    baseBackoffMs: options.baseBackoffMs ?? DEFAULT_BACKOFF_MS,
    cacheTtlMs: options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
    skipCache: options.skipCache ?? false,
  };

  const url = `${OPA_URL}/${path.replace(/^\//, '')}`;
  const body = JSON.stringify({ input });
  const cacheKey = buildCacheKey(path, input);

  if (!resolved.skipCache) {
    const cached = decisionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.decision;
    }
  }

  const decision = await executeWithRetry(url, body, resolved);

  if (!resolved.skipCache && resolved.cacheTtlMs > 0) {
    decisionCache.set(cacheKey, {
      expiresAt: Date.now() + resolved.cacheTtlMs,
      decision,
    });
  }

  return decision;
}

export function clearOpaDecisionCache() {
  decisionCache.clear();
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
