import type { PolicyContext } from './types.js';

export interface PolicyDecision { decision: 'allow' | 'deny'; reason?: string }

export class PolicyClient {
  constructor(private baseUrl: string, private fetchImpl: typeof fetch = fetch) {}

  async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
    const res = await this.fetchImpl(`${this.baseUrl}/policy/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ctx)
    });
    if (!res.ok) throw new Error(`PDP error ${res.status}`);
    return res.json() as Promise<PolicyDecision>;
  }
}
