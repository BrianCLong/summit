export type ExportMode = 'simulate' | 'enforce';

export interface ExportField { path: string; tags?: string[] }
export interface ExportResource {
  sensitivity: 'Public' | 'Internal' | 'Sensitive' | 'Restricted';
  fields?: ExportField[];
  explicit_dlp_mask_paths?: string[];
}

export interface ExportRequestBody {
  mode?: ExportMode;
  action: 'export';
  auth: { actor?: string; webauthn_verified?: boolean };
  resource: ExportResource;
}

export interface ExportDecision {
  mode: ExportMode;
  allow: boolean;
  redactions?: { path: string; reason: string }[];
  step_up?: { required: boolean; satisfied: boolean };
  reasons?: string[];
}

export interface ExportResponse { decision: ExportDecision; bundle_url?: string; task_id?: string }

export class ExportClient {
  constructor(private baseUrl: string, private headers: Record<string, string> = {}) {}

  async simulate(body: ExportRequestBody, init?: RequestInit): Promise<ExportDecision> {
    const res = await fetch(`${this.baseUrl}/export/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify(body),
      ...init,
    });
    if (!res.ok) throw new Error(`simulate failed: ${res.status}`);
    return (await res.json()) as ExportDecision;
  }

  async export(body: ExportRequestBody, init?: RequestInit): Promise<ExportResponse> {
    const res = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify(body),
      ...init,
    });
    if (res.status === 401 || res.status === 403) {
      const decision = (await res.json()) as ExportDecision;
      throw Object.assign(new Error('export not allowed'), { decision, status: res.status });
    }
    if (!res.ok) throw new Error(`export failed: ${res.status}`);
    return (await res.json()) as ExportResponse;
  }
}
