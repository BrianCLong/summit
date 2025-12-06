import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { components } from '../types/api.js';

// Mock data matching apps/web/src/lib/maestroApi.ts expectations
// This ensures the backend satisfies the API contract immediately.

const router = Router();

// --- Helper for mocks ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Types from Generated Spec ---
type RoutePreviewResponse = components['schemas']['RoutePreviewResponse'];
type RouteExecuteResponse = components['schemas']['RouteExecuteResponse'];
type WebInterfacesResponse = components['schemas']['WebInterfacesResponse'];
type OrchestrateWebResponse = components['schemas']['OrchestrateWebResponse'];
type BudgetsResponse = components['schemas']['BudgetsResponse'];
type PolicyCheckResponse = components['schemas']['PolicyCheckResponse'];

// --- Endpoints ---

router.post('/route/preview', async (req: Request, res: Response) => {
  // Mock response for now
  await sleep(250);
  const response: RoutePreviewResponse = {
    candidates: [
      {
        id: 'gpt-4o-mini',
        type: 'model',
        name: 'GPT‑4o‑mini',
        score: 0.82,
        cost_est: 0.004,
        latency_est_ms: 950,
        rationale: 'High prior win‑rate on Q/A; low cost.',
      },
      {
        id: 'web-serp',
        type: 'web',
        name: 'SERP+Reader',
        score: 0.74,
        cost_est: 0.002,
        latency_est_ms: 1200,
        rationale: 'Freshness likely needed; medium reliability.',
      },
      {
        id: 'claude-3.5',
        type: 'model',
        name: 'Claude 3.5',
        score: 0.68,
        cost_est: 0.012,
        latency_est_ms: 1300,
        rationale: 'Better on synthesis; higher cost.',
      },
    ],
  };
  res.json(response);
});

router.post('/route/execute', async (req: Request, res: Response) => {
  const { selection } = req.body;
  await sleep(400);
  const response: RouteExecuteResponse = {
    runId: `run_${Math.random().toString(36).slice(2)}`,
    steps: [
      {
        id: 'step1',
        source: selection?.[0] || 'gpt-4o-mini',
        status: 'ok',
        tokens: 520,
        cost: 0.006,
        citations: [
          { title: 'Open source report', url: 'https://example.com' },
        ],
        elapsed_ms: 910,
      },
      {
        id: 'step2',
        source: selection?.[1] || 'web-serp',
        status: 'ok',
        tokens: 0,
        cost: 0.001,
        citations: [
          { title: 'News site', url: 'https://news.example.com' },
        ],
        elapsed_ms: 1290,
      },
    ],
  };
  res.json(response);
});

router.get('/web/interfaces', async (req: Request, res: Response) => {
  await sleep(200);
  const response: WebInterfacesResponse = {
    items: [
      {
        id: 'web-serp',
        name: 'SERP Search',
        category: 'Search',
        reliability: 0.78,
        cost_hint: 1,
      },
      {
        id: 'web-reader',
        name: 'Reader',
        category: 'Content',
        reliability: 0.82,
        cost_hint: 1,
      },
      {
        id: 'social-scan',
        name: 'Social Scanner',
        category: 'OSINT',
        reliability: 0.61,
        cost_hint: 2,
      },
    ],
  };
  res.json(response);
});

router.post('/web/run', async (req: Request, res: Response) => {
  const { task, interfaces } = req.body;
  await sleep(600);
  const response: OrchestrateWebResponse = {
    responses: (interfaces || []).map((id: string, i: number) => ({
      id: `resp_${i}`,
      interface: id,
      text: `Result from ${id} for: ${task}`,
      citations: [{ title: 'Source A', url: 'https://example.com/a' }],
    })),
    synthesized: {
      text: `Synthesized answer for: ${task}`,
      citations: [
        { title: 'Merged Evidence', url: 'https://example.com/merged' },
      ],
    },
  };
  res.json(response);
});

router.get('/budgets', async (req: Request, res: Response) => {
  await sleep(180);
  const now = new Date();
  const series = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date(now.getTime() - (9 - i) * 3600_000);
    return { t: d.toISOString(), usd: 2 + i * 0.3, tokens: 1000 + i * 55 };
  });
  const response: BudgetsResponse = {
    tier: 'silver',
    remaining: { tokens: 84210, usd: 123.45 },
    burndown: series,
  };
  res.json(response);
});

router.post('/policy/check', async (req: Request, res: Response) => {
  const { action } = req.body;
  await sleep(120);
  let response: PolicyCheckResponse;
  if (action === 'export/report') {
    response = {
      allowed: false,
      reason: 'Export limited to Gold tier',
      elevation: { contact: 'secops@intelgraph.local', sla_hours: 24 },
    };
  } else {
    response = { allowed: true };
  }
  res.json(response);
});

router.get('/logs/stream', (req: Request, res: Response) => {
  // SSE Setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const interval = setInterval(() => {
    const levels = ['info', 'warn', 'error'] as const;
    const level = levels[Math.floor(Math.random() * levels.length)];
    sendEvent({
      ts: new Date().toISOString(),
      level,
      source: 'backend-mock',
      message: `Backend log event ${Math.random().toString(36).slice(7)}`,
    });
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

router.post('/runs', async (req: Request, res: Response) => {
  // Mock run creation
  const { requestText } = req.body;
  await sleep(100);
  res.json({
    run: {
      id: crypto.randomUUID(),
      status: 'queued',
      requestText,
      createdAt: new Date().toISOString(),
    },
  });
});

export default router;
