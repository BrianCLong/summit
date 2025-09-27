// =============================================
// File: apps/web/src/mocks/handlers/maestro.ts
// =============================================
import { http, HttpResponse } from 'msw';

export const maestroHandlers = [
  http.post('/maestro/route/preview', async () => {
    return HttpResponse.json({
      candidates: [
        { id: 'gpt-4o-mini', type: 'model', name: 'GPT‑4o‑mini', score: 0.82, cost_est: 0.004, latency_est_ms: 950, rationale: 'High prior win‑rate on Q/A; low cost.' },
        { id: 'web-serp', type: 'web', name: 'SERP+Reader', score: 0.74, cost_est: 0.002, latency_est_ms: 1200, rationale: 'Freshness likely needed; medium reliability.' },
      ],
    });
  }),
  http.post('/maestro/route/execute', async () => {
    return HttpResponse.json({
      runId: 'run_mock',
      steps: [
        { id: 's1', source: 'gpt-4o-mini', status: 'ok', tokens: 420, cost: 0.005, citations: [{ title: 'Doc', url: 'https://example.com' }], elapsed_ms: 900 },
      ],
    });
  }),
  http.get('/maestro/web/interfaces', async () => {
    return HttpResponse.json({ items: [
      { id: 'web-serp', name: 'SERP Search', category: 'Search', reliability: 0.78, cost_hint: 1 },
      { id: 'web-reader', name: 'Reader', category: 'Content', reliability: 0.82, cost_hint: 1 },
    ]});
  }),
  http.post('/maestro/web/run', async () => {
    return HttpResponse.json({
      responses: [
        { id: 'r1', interface: 'web-serp', text: 'SERP found X, Y, Z', citations: [{ title: 'A', url: 'https://a.example' }] },
      ],
      synthesized: { text: 'Merged X, Y, Z → Answer', citations: [{ title: 'A', url: 'https://a.example' }] },
    });
  }),
  http.get('/maestro/budgets', async () => {
    return HttpResponse.json({ tier: 'silver', remaining: { tokens: 84210, usd: 123.45 }, burndown: [
      { t: new Date().toISOString(), usd: 2.3, tokens: 1000 },
      { t: new Date(Date.now() - 3600_000).toISOString(), usd: 2.0, tokens: 950 },
    ] });
  }),
];
