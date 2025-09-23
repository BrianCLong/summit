// =============================================
// File: apps/web/src/lib/maestroApi.ts
// =============================================
export type Candidate = {
  id: string;
  type: 'model' | 'web';
  name: string;
  score: number;
  cost_est: number; // USD
  latency_est_ms: number;
  rationale: string;
};

export type RoutePreviewResponse = {
  candidates: Candidate[];
};

export type RouteExecuteStep = {
  id: string;
  source: string;
  status: 'ok' | 'fail';
  tokens?: number;
  cost?: number;
  citations?: Array<{ title: string; url: string }>;
  elapsed_ms: number;
};

export type RouteExecuteResponse = {
  runId: string;
  steps: RouteExecuteStep[];
};

export type WebInterface = {
  id: string;
  name: string;
  category: string;
  reliability: number; // 0..1
  cost_hint: number; // USD relative
};

export type WebInterfacesResponse = { items: WebInterface[] };

export type OrchestrateWebResponse = {
  responses: Array<{
    id: string;
    interface: string;
    text: string;
    citations: Array<{ title: string; url: string }>;
  }>;
  synthesized: { text: string; citations: Array<{ title: string; url: string }> };
};

export type BudgetsResponse = {
  tier: 'bronze' | 'silver' | 'gold';
  remaining: { tokens: number; usd: number };
  burndown: Array<{ t: string; usd: number; number }>;
};

export type PolicyCheckResponse = {
  allowed: boolean;
  reason?: string;
  elevation?: { contact: string; sla_hours: number };
};

export type LogEvent = {
  ts: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
};

export interface MaestroApiOptions {
  baseUrl?: string;
  mock?: boolean;
}

export class MaestroApi {
  private baseUrl: string;
  private mock: boolean;

  constructor(opts: MaestroApiOptions = {}) {
    this.baseUrl = opts.baseUrl || (import.meta as any).env?.VITE_MAESTRO_BASE_URL || '';
    this.mock = Boolean(opts.mock ?? (!this.baseUrl));
  }

  async routePreview(task: string, context?: Record<string, unknown>): Promise<RoutePreviewResponse> {
    if (this.mock) {
      await sleep(250);
      return {
        candidates: [
          { id: 'gpt-4o-mini', type: 'model', name: 'GPT‑4o‑mini', score: 0.82, cost_est: 0.004, latency_est_ms: 950, rationale: 'High prior win‑rate on Q/A; low cost.' },
          { id: 'web-serp', type: 'web', name: 'SERP+Reader', score: 0.74, cost_est: 0.002, latency_est_ms: 1200, rationale: 'Freshness likely needed; medium reliability.' },
          { id: 'claude-3.5', type: 'model', name: 'Claude 3.5', score: 0.68, cost_est: 0.012, latency_est_ms: 1300, rationale: 'Better on synthesis; higher cost.' },
        ],
      };
    }
    const res = await fetchJSON(`${this.baseUrl}/maestro/route/preview`, {
      method: 'POST',
      body: JSON.stringify({ task, context }),
    });
    return res as RoutePreviewResponse;
  }

  async routeExecute(task: string, selection: string[]): Promise<RouteExecuteResponse> {
    if (this.mock) {
      await sleep(400);
      return {
        runId: `run_${Math.random().toString(36).slice(2)}`,
        steps: [
          { id: 'step1', source: selection[0] || 'gpt-4o-mini', status: 'ok', tokens: 520, cost: 0.006, citations: [{ title: 'Open source report', url: 'https://example.com' }], elapsed_ms: 910 },
          { id: 'step2', source: selection[1] || 'web-serp', status: 'ok', tokens: 0, cost: 0.001, citations: [{ title: 'News site', url: 'https://news.example.com' }], elapsed_ms: 1290 },
        ],
      };
    }
    const res = await fetchJSON(`${this.baseUrl}/maestro/route/execute`, {
      method: 'POST',
      body: JSON.stringify({ task, selection }),
    });
    return res as RouteExecuteResponse;
  }

  async webInterfaces(): Promise<WebInterfacesResponse> {
    if (this.mock) {
      await sleep(200);
      return {
        items: [
          { id: 'web-serp', name: 'SERP Search', category: 'Search', reliability: 0.78, cost_hint: 1 },
          { id: 'web-reader', name: 'Reader', category: 'Content', reliability: 0.82, cost_hint: 1 },
          { id: 'social-scan', name: 'Social Scanner', category: 'OSINT', reliability: 0.61, cost_hint: 2 },
        ],
      };
    }
    const res = await fetchJSON(`${this.baseUrl}/maestro/web/interfaces`);
    return res as WebInterfacesResponse;
  }

  async orchestrateWeb(task: string, interfaces: string[]): Promise<OrchestrateWebResponse> {
    if (this.mock) {
      await sleep(600);
      return {
        responses: interfaces.map((id, i) => ({
          id: `resp_${i}`,
          interface: id,
          text: `Result from ${id} for: ${task}`,
          citations: [{ title: 'Source A', url: 'https://example.com/a' }],
        })),
        synthesized: {
          text: `Synthesized answer for: ${task}`,
          citations: [{ title: 'Merged Evidence', url: 'https://example.com/merged' }],
        },
      };
    }
    const res = await fetchJSON(`${this.baseUrl}/maestro/web/run`, {
      method: 'POST',
      body: JSON.stringify({ task, interfaces }),
    });
    return res as OrchestrateWebResponse;
  }

  async budgets(): Promise<BudgetsResponse> {
    if (this.mock) {
      await sleep(180);
      const now = new Date();
      const series = Array.from({ length: 10 }).map((_, i) => {
        const d = new Date(now.getTime() - (9 - i) * 3600_000);
        return { t: d.toISOString(), usd: 2 + i * 0.3, tokens: 1000 + i * 55 };
        
      });
      return { tier: 'silver', remaining: { tokens: 84210, usd: 123.45 }, burndown: series };
    }
    const res = await fetchJSON(`${this.baseUrl}/maestro/budgets`);
    return res as BudgetsResponse;
  }

  async policyCheck(action: string, payload?: Record<string, unknown>): Promise<PolicyCheckResponse> {
    if (this.mock) {
      await sleep(120);
      if (action === 'export/report') {
        return { allowed: false, reason: 'Export limited to Gold tier', elevation: { contact: 'secops@intelgraph.local', sla_hours: 24 } };
      }
      return { allowed: true };
    }
    const res = await fetchJSON(`${this.baseUrl}/maestro/policy/check`, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    });
    return res as PolicyCheckResponse;
  }

  logsStream(onEvent: (e: LogEvent) => void, onError?: (err: Event) => void): () => void {
    if (this.mock) {
      const interval = setInterval(() => {
        const levels = ['info', 'warn', 'error'] as const;
        const level = levels[Math.floor(Math.random() * levels.length)];
        onEvent({ ts: new Date().toISOString(), level, source: 'mock', message: `Mock ${level} message` });
      }, 1000);
      return () => clearInterval(interval);
    }
    const src = new EventSource(`${this.baseUrl}/maestro/logs/stream`);
    const listener = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data);
        onEvent(data);
      } catch (_) {
        // noop
      }
    };
    src.addEventListener('message', listener);
    if (onError) src.addEventListener('error', onError);
    return () => {
      src.removeEventListener('message', listener);
      src.close();
    };
  }
}

async function fetchJSON(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${text}`);
  }
  return res.json();
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// Single shared instance
export const maestroApi = new MaestroApi();
