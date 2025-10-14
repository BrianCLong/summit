import fetch from 'node-fetch';
import { PERSISTED } from './manifest.js';

type Headers = Record<string,string>;
const baseHeaders: Headers = {
  'content-type': 'application/json',
  'x-persisted-only': 'true',
  'x-provenance-capture': 'true'
};

export class McAdminClient {
  constructor(private url: string, private authHeaders: Headers = {}) {}

  private async call<T>(op: string, variables: any): Promise<T> {
    const sha = PERSISTED[op];
    if (!sha) throw new Error(`persisted_id_missing:${op}`);
    const body = {
      operationName: op,
      variables,
      extensions: { persistedQuery: { version: 1, sha256Hash: sha } }
    };
    const res = await fetch(this.url, { method: 'POST', headers: { ...baseHeaders, ...this.authHeaders }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const payload: any = await res.json();
    if (payload.errors?.length) throw new Error(payload.errors[0].message);
    return payload.data?.[op];
  }

  setFeatureFlags(vars: { tenant: string; flags: any }) { return this.call('setFeatureFlags', vars); }
  setCanaryWeights(vars: { tenant: string; weights: any }) { return this.call('setCanaryWeights', vars); }
  setSloThresholds(vars: { tenant: string; thresholds: any }) { return this.call('setSloThresholds', vars); }
  proposeRemediation(vars: { tenant: string; type: string; hitl: boolean }) { return this.call('proposeRemediation', vars); }
  canaryPromote(vars: { tenant: string }) { return this.call('canaryPromote', vars); }
  canaryHold(vars: { tenant: string }) { return this.call('canaryHold', vars); }
  evidencePack(vars: { version: string }) { return this.call('evidencePack', vars); }
  evidenceVerify() { return this.call('evidenceVerify', {}); }
  regulatorExport(vars: { tenant: string; profile: string }) { return this.call('regulatorExport', vars); }
  podrRun(vars: { tenant: string }) { return this.call('podrRun', vars); }
}