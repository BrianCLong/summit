# Symphony Tunability & Ops Pack — MVP‑1 (Operator‑grade)

**Goal:** Flip Symphony from “works” to “ops‑calm” with tunable routing, high‑fidelity visibility, professional UI, real‑time monitoring, and tight GitHub/Jira wiring. Everything here is additive to your existing proxy/UI. Drop‑in files are organized by path.

---

## 0) Architecture Sketch (operator mental model)

```mermaid
flowchart LR
  subgraph UI[Symphony UI]
    MM[Model Matrix]
    RB[Runbook Planner]
    EX[Explain Route Drawer]
    LG[Live Logs/Alerts]
  end
  subgraph Proxy[Symphony Proxy (8787)]
    RT[Router Core]
    SC[Window‑Aware Scheduler]
    PL[Policy Engine (OPA‑style)]
    MT[Metrics (/metrics, OTEL)]
    BD[Burndown (/status/burndown.json)]
    HL[Health (/status/health.json)]
    EV[Events (SSE/Socket.IO)]
    GH[GitHub/Jira Integrations]
  end
  GW[LiteLLM Gateway (4000)]
  LM[Local Models (Ollama/LM Studio)]
  HM[Hosted Models (Gemini, Grok Code)]
  PRM[(Prometheus)]
  GRA[(Grafana)]

  UI<-->EV
  UI<-->RT
  Proxy-->GW-->LM
  Proxy-->GW-->HM
  MT-->PRM-->GRA
  BD-->GRA
  HL-->GRA
  GH-->GitHub
  GH-->Jira
```

> **Key ideas**: (1) **Window‑Aware Scheduler** ensures we exploit time‑boxed usage windows (e.g., 5h/day) without waking SRE; (2) **Policy Engine** gates by LOA, license, and cost; (3) **Model Matrix** shows live capacity, windows, RPM/TPM, TTFB, and failure budgets; (4) **Explain Route** reveals why a decision was made; (5) Prometheus/Grafana wire up SLOs and burndown alerts.

---

## 1) Router Policy, Usage Windows & Fine‑Grained Controls

**File:** `services/proxy/src/router/policy.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Symphony Router Policy",
  "type": "object",
  "required": ["models", "rules"],
  "properties": {
    "models": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "name",
          "provider",
          "class",
          "context_tokens",
          "rpm_cap",
          "tpm_cap"
        ],
        "properties": {
          "name": { "type": "string" },
          "provider": { "type": "string" },
          "class": { "type": "string", "enum": ["local", "hosted"] },
          "context_tokens": { "type": "integer", "minimum": 1024 },
          "rpm_cap": { "type": "integer", "minimum": 1 },
          "tpm_cap": { "type": "integer", "minimum": 1 },
          "daily_usd_cap": { "type": "number", "minimum": 0 },
          "usage_windows": {
            "description": "Array of allowed local times (24h) with optional days mask.",
            "type": "array",
            "items": {
              "type": "object",
              "required": ["start", "end"],
              "properties": {
                "start": {
                  "type": "string",
                  "pattern": "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                },
                "end": {
                  "type": "string",
                  "pattern": "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                },
                "days": {
                  "type": "array",
                  "items": { "type": "integer", "minimum": 0, "maximum": 6 }
                }
              }
            }
          },
          "allow_tasks": { "type": "array", "items": { "type": "string" } },
          "deny_tasks": { "type": "array", "items": { "type": "string" } },
          "loa_max": { "type": "integer", "minimum": 0, "maximum": 3 },
          "temperature_bounds": {
            "type": "object",
            "properties": {
              "min": { "type": "number" },
              "max": { "type": "number" }
            }
          },
          "preamble": { "type": "string" }
        }
      }
    },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["match", "route"],
        "properties": {
          "match": {
            "type": "object",
            "properties": {
              "task": { "type": "string" },
              "loa": { "type": "integer" },
              "risk": { "type": "string", "enum": ["low", "medium", "high"] },
              "requires_tools": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "route": {
            "type": "object",
            "properties": {
              "prefer": { "type": "array", "items": { "type": "string" } },
              "fallback": { "type": "array", "items": { "type": "string" } },
              "max_cost_usd": { "type": "number" },
              "stream": { "type": "boolean" },
              "context_budget_tokens": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}
```

**File:** `services/proxy/src/router/scheduler.ts` (TypeScript, robust window‑aware routing)

```ts
import { DateTime } from 'luxon';

export type Window = { start: string; end: string; days?: number[] };
export type ModelCaps = {
  name: string;
  class: 'local' | 'hosted';
  rpm_cap: number;
  tpm_cap: number;
  daily_usd_cap?: number;
  usage_windows?: Window[];
  counters: {
    rpm: number;
    tpm: number;
    usd_today: number;
    window_open: boolean;
  };
};

export function isWindowOpen(
  windows: Window[] | undefined,
  now = DateTime.local(),
): boolean {
  if (!windows || windows.length === 0) return true; // no windows means always on
  const wd = now.weekday % 7; // 1..7 → 0..6
  const hm = now.toFormat('HH:mm');
  return windows.some(
    (w) => (w.days ? w.days.includes(wd) : true) && hm >= w.start && hm < w.end,
  );
}

export function canRoute(model: ModelCaps): { ok: boolean; reason?: string } {
  if (!isWindowOpen(model.usage_windows))
    return { ok: false, reason: 'window_closed' };
  if (model.counters.rpm >= model.rpm_cap)
    return { ok: false, reason: 'rpm_exhausted' };
  if (model.counters.tpm >= model.tpm_cap)
    return { ok: false, reason: 'tpm_exhausted' };
  if (model.daily_usd_cap && model.counters.usd_today >= model.daily_usd_cap) {
    return { ok: false, reason: 'budget_exhausted' };
  }
  return { ok: true };
}

export function pickModel(
  candidates: ModelCaps[],
  pref: string[] = [],
  fallback: string[] = [],
): { chosen?: ModelCaps; denied: Record<string, string> } {
  const denied: Record<string, string> = {};
  const order = [
    ...pref,
    ...candidates.map((c) => c.name).filter((n) => !pref.includes(n)),
    ...fallback,
  ];
  for (const name of order) {
    const m = candidates.find((c) => c.name === name);
    if (!m) continue;
    const gate = canRoute(m);
    if (gate.ok) return { chosen: m, denied };
    denied[name] = gate.reason || 'unknown';
  }
  return { denied };
}
```

**File:** `services/proxy/src/router/policy.ts` (validate + explainable decision)

```ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './policy.schema.json';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema as any);

export type Decision = {
  allow: boolean;
  model?: string;
  denial?: string;
  reasons: Array<{ model: string; reason: string }>; // for Explain Route
};

export function decide(
  policy: any,
  req: { task: string; loa: number; risk?: string },
): Decision {
  if (!validate(policy)) {
    return { allow: false, denial: 'policy_invalid', reasons: [] };
  }
  const candidates = policy.models.map((m: any) => ({
    ...m,
    counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: true },
  }));
  const rule = policy.rules.find(
    (r: any) =>
      (!r.match.task || r.match.task === req.task) &&
      (r.match.loa === undefined || r.match.loa >= req.loa),
  );
  if (!rule) return { allow: false, denial: 'no_matching_rule', reasons: [] };
  const { pickModel } = require('./scheduler');
  const { chosen, denied } = pickModel(
    candidates,
    rule.route.prefer,
    rule.route.fallback,
  );
  if (!chosen) {
    return {
      allow: false,
      denial: 'no_model_available',
      reasons: Object.entries(denied).map(([model, reason]) => ({
        model,
        reason,
      })),
    };
  }
  return {
    allow: true,
    model: chosen.name,
    reasons: Object.entries(denied).map(([model, reason]) => ({
      model,
      reason,
    })),
  };
}
```

---

## 2) Proxy: Observability (Prometheus + OTEL) & Expanded Status

**File:** `services/proxy/src/metrics.ts`

```ts
import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpReqLatency = new client.Histogram({
  name: 'symphony_http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['route', 'method', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpReqLatency);

export const routeExecuteLatency = new client.Histogram({
  name: 'symphony_route_execute_latency_seconds',
  help: 'Latency for /route/execute',
  labelNames: ['model', 'stream', 'status'],
});
register.registerMetric(routeExecuteLatency);

export const budgetFraction = new client.Gauge({
  name: 'symphony_model_budget_fraction_used',
  help: 'Fraction of daily budget used',
  labelNames: ['model'],
});
register.registerMetric(budgetFraction);

export function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

export function timed(routeLabel: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpReqLatency.startTimer({
      route: routeLabel,
      method: req.method,
    });
    res.on('finish', () => end({ status: String(res.statusCode) }));
    next();
  };
}
```

**File:** `services/proxy/src/routes/status.ts`

```ts
import { Router } from 'express';
const r = Router();

r.get('/status/health.json', (_req, res) => {
  res.json({
    services: { litellm: true, ollama: true, gateway: true },
    version: process.env.APP_VERSION || 'dev',
  });
});

r.get('/status/burndown.json', (_req, res) => {
  const now = new Date().toISOString();
  res.json({ generated_at: now, windows: { m1: {}, h1: {}, d1: {} } });
});

export default r;
```

**File:** `services/proxy/src/server.ts` (excerpt: wire metrics + status)

```ts
import express from 'express';
import statusRoutes from './routes/status';
import { metricsHandler, timed } from './metrics';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(timed('all'));
app.use(statusRoutes);
app.get('/metrics', metricsHandler);

app.listen(8787, () => console.log('Proxy listening on :8787'));
```

**File:** `prometheus/prometheus.yml`

```yaml
scrape_configs:
  - job_name: symphony-proxy
    metrics_path: /metrics
    static_configs:
      - targets: ['host.docker.internal:8787']
```

**File:** `prometheus/alerting-rules.yml`

```yaml
groups:
  - name: symphony-slo
    rules:
      - alert: RouteExecuteP95High
        expr: histogram_quantile(0.95, sum(rate(symphony_route_execute_latency_seconds_bucket[5m])) by (le)) > 6
        for: 10m
        labels: { severity: page }
        annotations:
          summary: 'p95 route/execute over SLO'
      - alert: BudgetExhaustion
        expr: max_over_time(symphony_model_budget_fraction_used[5m]) > 0.8
        for: 2m
        labels: { severity: warn }
        annotations:
          summary: 'Model budget at >80%'
```

---

## 3) GitHub & Ticketing Integrations

**File:** `services/proxy/src/integrations/github.ts`

```ts
import { Octokit } from '@octokit/rest';

const owner = process.env.GH_OWNER!;
const repo = process.env.GH_REPO!;
const token = process.env.GH_TOKEN!;
const octo = new Octokit({ auth: token });

export async function fileIncident(
  title: string,
  body: string,
  labels: string[] = ['incident'],
): Promise<number> {
  const r = await octo.issues.create({ owner, repo, title, body, labels });
  return r.data.number;
}

export async function upsertRunReport(
  auditId: string,
  jsonl: string,
): Promise<void> {
  const path = `runs/${auditId}.jsonl`;
  await octo.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `chore(run-report): ${auditId}`,
    content: Buffer.from(jsonl).toString('base64'),
    committer: { name: 'sym‑bot', email: 'bot@symphony.local' },
    author: { name: 'sym‑bot', email: 'bot@symphony.local' },
  });
}
```

**File:** `services/proxy/src/integrations/jira.ts`

```ts
import fetch from 'node-fetch';

export async function createJiraIssue({
  baseUrl,
  email,
  apiToken,
  projectKey,
  summary,
  description,
}: any) {
  const url = `${baseUrl}/rest/api/3/issue`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64'),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description,
        issuetype: { name: 'Task' },
      },
    }),
  });
  if (!res.ok)
    throw new Error(`Jira create failed: ${res.status} ${await res.text()}`);
  return res.json();
}
```

---

## 4) Explainable Routing & Run Reports

**File:** `services/proxy/src/routes/route.ts` (excerpts)

```ts
import { Router } from 'express';
import { decide } from '../router/policy';
import { routeExecuteLatency } from '../metrics';
import { upsertRunReport } from '../integrations/github';

const r = Router();

r.post('/route/plan', (req, res) => {
  const decision = decide(req.app.get('policy'), req.body);
  res.json({ decision, policy: { allow: decision.allow } });
});

r.post('/route/execute', async (req, res) => {
  const start = process.hrtime.bigint();
  const decision = decide(req.app.get('policy'), req.body);
  if (!decision.allow || !decision.model) return res.status(429).json(decision);

  // pseudo‑call to gateway here (replace with real client)
  const { model } = decision;
  try {
    const output = { text: `hello from ${model}` };
    const latencyMs = Number((process.hrtime.bigint() - start) / 1000000n);
    routeExecuteLatency.observe(
      { model, stream: String(Boolean(req.body.stream)), status: 'ok' },
      latencyMs / 1000,
    );
    const audit_id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await upsertRunReport(
      audit_id,
      JSON.stringify({ decision, req }, null, 0) + '\n',
    );
    res.json({
      audit_id,
      latency_ms: latencyMs,
      output,
      explain: decision.reasons,
    });
  } catch (e: any) {
    routeExecuteLatency.observe(
      { model, stream: String(Boolean(req.body.stream)), status: 'err' },
      0,
    );
    return res.status(502).json({ error: 'gateway_failed', detail: e.message });
  }
});

export default r;
```

---

## 5) Professional UI: Model Matrix, Explain Drawer, Runbook Planner

**Stack:** React 18 + MUI + Redux Toolkit + Socket.IO; jQuery for DOM/event sugar in components that need it.

**File:** `apps/web/src/features/ModelMatrix.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { io } from 'socket.io-client';
import $ from 'jquery';

const socket = io('/', { path: '/events' });

type Row = {
  id: string;
  class: 'local' | 'hosted';
  window: 'open' | 'closed';
  rpm: number;
  rpmCap: number;
  tpm: number;
  tpmCap: number;
  budgetFrac: number;
  p95ms: number;
  ttfbms: number;
};

const cols: GridColDef[] = [
  { field: 'id', headerName: 'Model', flex: 1 },
  { field: 'class', headerName: 'Class', width: 100 },
  { field: 'window', headerName: 'Window', width: 110 },
  { field: 'rpm', headerName: 'RPM', width: 90 },
  { field: 'rpmCap', headerName: 'RPM Cap', width: 110 },
  { field: 'tpm', headerName: 'TPM', width: 100 },
  { field: 'tpmCap', headerName: 'TPM Cap', width: 120 },
  {
    field: 'budgetFrac',
    headerName: 'Budget',
    width: 110,
    valueFormatter: (v) => `${Math.round(Number(v) * 100)}%`,
  },
  { field: 'p95ms', headerName: 'p95', width: 90 },
  { field: 'ttfbms', headerName: 'TTFB', width: 90 },
];

export default function ModelMatrix() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    socket.on('model_stats', (payload: Row[]) => setRows(payload));
    return () => socket.off('model_stats');
  }, []);

  useEffect(() => {
    // subtle attention jQuery pulse on critical thresholds
    rows.forEach((r) => {
      if (r.budgetFrac > 0.8 || r.window === 'closed') {
        const el = $(`div[role=row][data-id="${r.id}"]`);
        el.stop(true, true).fadeOut(100).fadeIn(100);
      }
    });
  }, [rows]);

  return (
    <div style={{ height: 420, width: '100%' }}>
      <DataGrid
        density="compact"
        rows={rows}
        columns={cols}
        disableRowSelectionOnClick
      />
    </div>
  );
}
```

**File:** `apps/web/src/features/ExplainRouteDrawer.tsx`

```tsx
import React from 'react';
import { Drawer, List, ListItem, ListItemText, Chip } from '@mui/material';

export function ExplainRouteDrawer({
  open,
  onClose,
  explain,
}: {
  open: boolean;
  onClose: () => void;
  explain: Array<{ model: string; reason: string }>;
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div style={{ width: 420, padding: 16 }}>
        <h3>Explain Route</h3>
        <List>
          {explain?.map((e, i) => (
            <ListItem key={i}>
              <ListItemText primary={e.model} secondary={e.reason} />
              <Chip size="small" label={e.reason} />
            </ListItem>
          ))}
        </List>
      </div>
    </Drawer>
  );
}
```

**File:** `apps/web/src/features/RunbookPlanner.tsx`

```tsx
import React, { useState } from 'react';
import {
  Button,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
} from '@mui/material';
import $ from 'jquery';

export default function RunbookPlanner() {
  const [task, setTask] = useState('qa');
  const [loa, setLoa] = useState(1);
  const [stream, setStream] = useState(true);
  const [input, setInput] = useState('say hello');

  function execute() {
    $.ajax({
      url: '/route/execute',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ task, loa, input, stream }),
      success: (resp) => console.log('audit_id', resp.audit_id),
      error: (xhr) => console.error(xhr.responseText),
    });
  }

  return (
    <Stack spacing={2} direction="row" alignItems="center">
      <TextField
        size="small"
        label="Task"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <TextField
        size="small"
        label="LoA"
        type="number"
        value={loa}
        onChange={(e) => setLoa(Number(e.target.value))}
      />
      <TextField
        size="small"
        label="Input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ minWidth: 280 }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={stream}
            onChange={(e) => setStream(e.target.checked)}
          />
        }
        label="Stream"
      />
      <Button variant="contained" onClick={execute}>
        Plan & Execute
      </Button>
    </Stack>
  );
}
```

**File:** `apps/web/src/theme.ts`

```ts
import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: { mode: 'dark' },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 9999 } },
    },
  },
});
```

**File:** `apps/web/public/_headers` (CSP)

```
Content-Security-Policy: default-src 'self'; connect-src 'self' http://127.0.0.1:8787 http://127.0.0.1:4000 http://127.0.0.1:11434; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'
```

**Mermaid Hardening (React)**

```tsx
import mermaid from 'mermaid';
import { useEffect } from 'react';
useEffect(() => {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
  });
}, []);
useEffect(
  () => {
    mermaid.run({ querySelector: '.mermaid' });
  },
  [
    /* activeTab or visibility */
  ],
);
```

---

## 6) Realtime Monitoring: Events bus (Socket.IO) & SSE

**File:** `services/proxy/src/events.ts`

```ts
import { Server } from 'socket.io';
import http from 'http';

export function attach(ioServer: http.Server) {
  const io = new Server(ioServer, { path: '/events', cors: { origin: '*' } });
  setInterval(() => {
    // emit synthetic stats until wired to real counters
    io.emit('model_stats', [
      {
        id: 'local/ollama',
        class: 'local',
        window: 'open',
        rpm: 3,
        rpmCap: 120,
        tpm: 10000,
        tpmCap: 1000000,
        budgetFrac: 0.12,
        p95ms: 450,
        ttfbms: 120,
      },
      {
        id: 'gemini/1.5-pro',
        class: 'hosted',
        window: 'open',
        rpm: 1,
        rpmCap: 30,
        tpm: 5000,
        tpmCap: 300000,
        budgetFrac: 0.62,
        p95ms: 2100,
        ttfbms: 600,
      },
    ]);
  }, 2000);
}
```

---

## 7) SLOs & Dashboards

**File:** `grafana/dashboards/symphony.json` (panel subset)

```json
{
  "title": "Symphony Ops",
  "panels": [
    {
      "type": "timeseries",
      "title": "p95 route/execute",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(symphony_route_execute_latency_seconds_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Budget fraction by model",
      "targets": [{ "expr": "symphony_model_budget_fraction_used" }]
    },
    {
      "type": "stat",
      "title": "Error rate 15m",
      "targets": [
        {
          "expr": "sum(rate(nodejs_http_server_errors_total[15m])) / sum(rate(nodejs_http_requests_total[15m]))"
        }
      ]
    }
  ]
}
```

---

## 8) Security/Governance Reinforcements

- **Proxy allowlist only** for run actions; deny shell metacharacters.
- **LOA/kill** enforced server‑side; UI is UX only.
- **CORS** strict origins; strip Authorization on cross‑origin redirects.
- **Logs**: PII redaction, line‑length cap, rotate `tmp/litellm.log`.
- **Rate limits** per IP + route (`/route/execute`, `/rag/query`).
- **Policy PUT**: schema validate against `policy.schema.json`; persist `version`, `updated_by`, `request_id`.

**File:** `services/proxy/src/middleware/ratelimit.ts`

```ts
import rateLimit from 'express-rate-limit';
export const strictRate = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 9) Justfile — Ops & Verification Add‑ons

**File:** `Justfile.metrics`

```make
set shell := ["/bin/bash", "-euco", "pipefail"]

symphony-metrics:
	curl -fsS ${PROXY_BASE:-http://127.0.0.1:8787}/metrics | head -n 50

symphony-slos:
	curl -fsS ${PROM_BASE:-http://127.0.0.1:9090}/api/v1/rules | jq '.data.groups[]|select(.name=="symphony-slo")'

symphony-drill:
	# Simulate provider 429s and budget nearing exhaustion
	for i in {1..20}; do \
	  curl -fsS -X POST -H 'content-type: application/json' \
	    -d '{"task":"qa","input":"hello","env":"dev","loa":1}' \
	    ${PROXY_BASE:-http://127.0.0.1:8787}/route/execute >/dev/null || true; \
	done; echo "drill done"
```

---

## 10) Tests (Jest) — Scheduler & Policy

**File:** `services/proxy/test/scheduler.test.ts`

```ts
import { isWindowOpen, pickModel } from '../src/router/scheduler';
import { DateTime } from 'luxon';

test('window open/closed', () => {
  const w = [{ start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }];
  expect(isWindowOpen(w, DateTime.fromISO('2025-08-29T10:00:00'))).toBe(true);
  expect(isWindowOpen(w, DateTime.fromISO('2025-08-30T10:00:00'))).toBe(false); // Saturday
});

test('pick prefers open model', () => {
  const c = [
    {
      name: 'A',
      class: 'hosted',
      rpm_cap: 1,
      tpm_cap: 1,
      usage_windows: [{ start: '00:00', end: '00:01' }],
      counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: false },
    },
    {
      name: 'B',
      class: 'local',
      rpm_cap: 100,
      tpm_cap: 1_000_000,
      counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: true },
    },
  ];
  const { chosen } = pickModel(c as any, ['A', 'B']);
  expect(chosen!.name).toBe('B');
});
```

---

## 11) UX Polish & Accessibility

- **A11y**: add `<figcaption>` for mermaid figures; aria‑labels on DataGrid; keyboard shortcuts via command palette.
- **Virtualize** large tables (MUI DataGrid already virtualized).
- **Streaming**: always prefer model streaming to cut TTFB; display partials in log pane.
- **Brand**: dark theme with generous spacing, \(16px radius\), compact DataGrid for density.

---

## 12) Rollout Plan (branch & CI)

- Branch: `feature/tunability-ops-pack`.
- First PR: router policy + scheduler + metrics; tests green.
- Second PR: UI Model Matrix + Explain Drawer + events bus.
- Third PR: Prometheus/Grafana, alert rules, Justfile metrics, GH/Jira integration.
- Add CODEOWNERS gates and SLO dashboards links.

---

## 13) Operator Runbooks (Game‑day, 1h)

- **Kill=ON** → verify risky actions block with `denial` reason codes.
- **Provider 429s** → UI banner, jittered retries; Prometheus alert `RouteExecuteP95High` muted with ticket auto‑opened.
- **Budget 95%** → Model Matrix pulses; soft throttle + guidance.
- **Neo4j Guard crash** → error surfaced, no orphans.
- **RAG missing** → UI shows degraded state, blocks export sans cites.

---

## 14) Future Hooks

- Model‑specific **skill tags** and evaluation telemetry (route learning).
- **Queue depth** backpressure visualizations.
- **Planner** that predicts cost/time per route using recent latency distributions.
- **Graph analytics** counters into Prometheus (PageRank durations, Cypher p95 per query kind).

```

```
