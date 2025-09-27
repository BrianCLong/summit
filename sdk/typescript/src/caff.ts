export type Decision = 'allow' | 'deny' | 'step-up';

export interface ExplainStep {
  rule: string;
  result: string;
  details?: string;
}

export interface Rollout {
  percentage?: number;
}

export interface Flag {
  key: string;
  description?: string;
  purposes?: string[];
  jurisdictions?: string[];
  audiences?: string[];
  expiresAt: string;
  rollout?: Rollout;
}

export interface SubjectContext {
  subjectId: string;
  bucketId?: string;
  jurisdiction?: string;
  audiences?: string[];
  consents?: Record<string, string>;
  evaluatedAt?: string;
}

export interface EvaluateRequest {
  flagKey: string;
  context: SubjectContext;
}

export interface EvaluateResponse {
  decision: Decision;
  explainPath: ExplainStep[];
}

export interface Policy {
  flags: Record<string, Flag>;
}

export interface PolicyResponse {
  policy: Policy;
}

export interface DryRunRequest {
  oldPolicy: Policy;
  newPolicy: Policy;
  contexts?: EvaluateRequest[];
}

export interface DryRunDecisionChange {
  flagKey: string;
  context: SubjectContext;
  oldDecision: EvaluateResponse;
  newDecision: EvaluateResponse;
}

export interface DryRunResponse {
  changes: Array<{
    flag: string;
    type: 'added' | 'removed' | 'updated';
    changedFields?: string[];
  }>;
  decisions: DryRunDecisionChange[];
}

export class CaffClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly baseUrl: string, fetchImpl?: typeof fetch) {
    this.fetcher = fetchImpl ?? (globalThis.fetch as typeof fetch);
    if (!this.fetcher) {
      throw new Error('Fetch API is required');
    }
  }

  async getPolicy(): Promise<Policy> {
    const res = await this.fetcher(this.joinUrl('/policy'));
    if (!res.ok) {
      throw new Error(`failed to fetch policy: ${res.statusText}`);
    }
    const body = (await res.json()) as PolicyResponse;
    return body.policy;
  }

  async setPolicy(policy: Policy): Promise<Policy> {
    const res = await this.fetcher(this.joinUrl('/policy'), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ policy }),
    });
    if (!res.ok) {
      const message = await this.safeError(res);
      throw new Error(`failed to set policy: ${message}`);
    }
    const body = (await res.json()) as PolicyResponse;
    return body.policy;
  }

  async isEnabled(flagKey: string, context: SubjectContext): Promise<EvaluateResponse> {
    const res = await this.fetcher(this.joinUrl('/evaluate'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flagKey, context }),
    });
    if (!res.ok) {
      const message = await this.safeError(res);
      throw new Error(`evaluation failed: ${message}`);
    }
    return (await res.json()) as EvaluateResponse;
  }

  async dryRun(request: DryRunRequest): Promise<DryRunResponse> {
    const res = await this.fetcher(this.joinUrl('/dry-run'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const message = await this.safeError(res);
      throw new Error(`dry-run failed: ${message}`);
    }
    return (await res.json()) as DryRunResponse;
  }

  evaluateLocal(flag: Flag, context: SubjectContext, now: Date = new Date()): EvaluateResponse {
    const explainPath: ExplainStep[] = [{ rule: 'flag', result: flag.key }];
    const expiry = new Date(flag.expiresAt);
    if (expiry.getTime() <= now.getTime()) {
      explainPath.push({ rule: 'expiry', result: 'deny', details: expiry.toISOString() });
      return { decision: 'deny', explainPath };
    }
    explainPath.push({ rule: 'expiry', result: 'ok', details: expiry.toISOString() });

    const jurisdiction = context.jurisdiction ?? '';
    if (flag.jurisdictions && flag.jurisdictions.length > 0 && !includesInsensitive(flag.jurisdictions, jurisdiction)) {
      explainPath.push({ rule: 'jurisdiction', result: 'deny', details: jurisdiction });
      return { decision: 'deny', explainPath };
    }
    explainPath.push({ rule: 'jurisdiction', result: 'ok', details: jurisdiction });

    const audiences = context.audiences ?? [];
    if (flag.audiences && flag.audiences.length > 0 && !overlapsInsensitive(flag.audiences, audiences)) {
      explainPath.push({ rule: 'audience', result: 'deny', details: audiences.join(',') });
      return { decision: 'deny', explainPath };
    }
    explainPath.push({ rule: 'audience', result: 'ok', details: audiences.join(',') });

    const consents = context.consents ?? {};
    const missing: string[] = [];
    const denied: string[] = [];
    for (const purpose of flag.purposes ?? []) {
      const consent = (consents[purpose] ?? '').toLowerCase();
      if (['granted', 'allow', 'yes', 'true'].includes(consent)) {
        explainPath.push({ rule: 'purpose', result: 'granted', details: purpose });
        continue;
      }
      if (['denied', 'no', 'false'].includes(consent)) {
        denied.push(purpose);
      } else {
        missing.push(purpose);
      }
    }
    if (denied.length > 0) {
      explainPath.push({ rule: 'purpose', result: 'deny', details: denied.join(',') });
      return { decision: 'deny', explainPath };
    }
    if (missing.length > 0) {
      explainPath.push({ rule: 'purpose', result: 'step-up', details: missing.join(',') });
      return { decision: 'step-up', explainPath };
    }

    const rolloutPercentage = flag.rollout?.percentage ?? 100;
    const bucketId = context.bucketId || context.subjectId;
    const bucket = fnv1a(`${flag.key}::${bucketId}`);
    explainPath.push({ rule: 'bucket', result: `${bucket}`, details: `rollout=${rolloutPercentage}` });
    if (bucket >= rolloutPercentage) {
      explainPath.push({ rule: 'rollout', result: 'deny' });
      return { decision: 'deny', explainPath };
    }
    explainPath.push({ rule: 'rollout', result: 'allow' });

    return { decision: 'allow', explainPath };
  }

  private joinUrl(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private async safeError(res: Response): Promise<string> {
    try {
      const body = await res.json();
      if (typeof body === 'object' && body && 'error' in body) {
        return String((body as Record<string, unknown>).error);
      }
      return JSON.stringify(body);
    } catch (err) {
      return res.statusText;
    }
  }
}

function includesInsensitive(list: string[], value: string): boolean {
  return list.some((item) => item.localeCompare(value, undefined, { sensitivity: 'accent' }) === 0);
}

function overlapsInsensitive(a: string[], b: string[]): boolean {
  return a.some((value) => includesInsensitive(b, value));
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash % 100;
}
