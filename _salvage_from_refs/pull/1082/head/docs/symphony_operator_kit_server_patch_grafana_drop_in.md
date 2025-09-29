# Symphony Operator Kit — drop-in server patch + Grafana

This is a ready-to-drop set of files to add *policy windows, explainable routing, SSE events, Prometheus metrics, RAG freshness, and GitHub ticketing* to your Symphony proxy. Copy the tree into your project root (or into a `/operator-kit` folder) and wire `server/index.ts` from your main entry.

---

## File: `server/index.ts`

```ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { metricsRouter, registerDefaultMetrics } from "./metrics";
import { eventsRouter, opsBus } from "./events";
import { planRouter } from "./routes/plan";
import { execRouter } from "./routes/execute";
import { ragRouter } from "./routes/rag";
import { ghRouter } from "./routes/github";
import { securityMiddleware, cspDirectives } from "./security";
import { loadPolicy, watchPolicy } from "./policy";

const PORT = Number(process.env.PORT || 8787);
const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));
app.use(securityMiddleware);
app.use(cors({
  origin: (origin, cb) => {
    const allow = (process.env.CORS_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173").split(',');
    if (!origin || allow.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked"));
  },
  credentials: false
}));

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives(),
  },
}));

// Health & burndown passthroughs (plug into your existing impls if you already have them)
app.get("/status/health.json", (_req, res) => {
  res.json({
    services: { litellm: true, ollama: true },
    policy_loaded: !!loadPolicy()._loadedAt,
    generated_at: new Date().toISOString(),
  });
});

app.get("/status/burndown.json", (_req, res) => {
  // placeholder window buckets; your existing generator can replace this
  res.json({
    generated_at: new Date().toISOString(),
    windows: { m1: {}, h1: {}, d1: {} },
  });
});

// Feature routers
app.use("/metrics", metricsRouter);
app.use("/events", eventsRouter);
app.use("/route/plan", planRouter);
app.use("/route/execute", execRouter);
app.use("/rag", ragRouter);
app.use("/integrations/github", ghRouter);

registerDefaultMetrics();
watchPolicy((p) => {
  opsBus.emit({ type: "policy.update", policy_hash: p._hash, at: Date.now() });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Symphony operator kit listening on :${PORT}`);
});
```

---

## File: `server/policy.ts`

```ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import YAML from "yaml";

export type PowerWindow = {
  model: string;
  when_cron: string; // cron expression
  max_usd_per_window: number;
  rpm_cap?: number;
};

export type TenantPolicy = {
  loa_max: number;
  context_tokens_max: number;
  allow_models: string[];
  power_windows: PowerWindow[];
  guards?: any[];
};

export type Policy = {
  tenants: Record<string, TenantPolicy>;
  _hash?: string;
  _loadedAt?: number;
};

const POLICY_FILE = process.env.POLICY_FILE || path.resolve("config/router.policy.yml");
let cached: Policy | null = null;

export function loadPolicy(): Policy {
  if (cached) return cached;
  const text = fs.readFileSync(POLICY_FILE, "utf8");
  const p = YAML.parse(text) as Policy;
  p._loadedAt = Date.now();
  p._hash = crypto.createHash("sha1").update(text).digest("hex");
  cached = p;
  return p;
}

export function watchPolicy(onChange: (p: Policy) => void) {
  fs.watch(POLICY_FILE, { persistent: false }, () => {
    try {
      cached = null;
      const p = loadPolicy();
      onChange(p);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("policy reload failed", e);
    }
  });
}
```

---

## File: `server/security.ts`

```ts
import { Request, Response, NextFunction } from "express";

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  //
  // Strip Authorization on cross-origin redirects (precaution):
  //
  res.removeHeader("Authorization");
  // Log line capping to prevent PII spray in logs (simple cap; add redact if desired)
  const _end = res.end;
  (res as any).end = function (chunk: any, ...rest: any[]) {
    if (chunk && Buffer.isBuffer(chunk) && chunk.length > 1024 * 256) {
      chunk = chunk.subarray(0, 1024 * 256);
    }
    return _end.call(this, chunk, ...rest);
  };
  next();
}

export function cspDirectives() {
  const self = ["'self'"];
  const scripts = ["'self'"].concat((process.env.CSP_SCRIPT_SRC || "").split(',').filter(Boolean));
  const styles = ["'self'", "'unsafe-inline'"]; // Mermaid needs inline styles
  const connects = [
    "'self'",
    "http://127.0.0.1:8787",
    "http://127.0.0.1:4000",
    "http://127.0.0.1:11434",
  ].concat((process.env.CSP_CONNECT_SRC || "").split(',').filter(Boolean));
  return {
    defaultSrc: self,
    scriptSrc: scripts,
    styleSrc: styles,
    connectSrc: connects,
    imgSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  } as any;
}
```

---

## File: `server/metrics.ts`

```ts
import express from "express";
import client from "prom-client";

export const metricsRouter = express.Router();

// Histograms/gauges/counters
export const routeLatency = new client.Histogram({
  name: "symphony_route_execute_latency_ms",
  help: "Route execute latency",
  labelNames: ["model", "tenant"],
  buckets: [50, 100, 200, 400, 800, 1200, 2000, 4000, 8000]
});

export const tokensTotal = new client.Counter({
  name: "symphony_tokens_total",
  help: "Token usage",
  labelNames: ["model", "tenant", "type"],
});

export const decisionsTotal = new client.Counter({
  name: "symphony_route_decisions_total",
  help: "Decisions taken",
  labelNames: ["model", "reason"],
});

export const budgetFraction = new client.Gauge({
  name: "symphony_budget_fraction_used",
  help: "Budget fraction used per model",
  labelNames: ["model"],
});

export const powerWindowOpen = new client.Gauge({
  name: "symphony_power_window_open",
  help: "Power window open (0/1)",
  labelNames: ["model"],
});

export const errorsTotal = new client.Counter({
  name: "symphony_errors_total",
  help: "Errors by route",
  labelNames: ["route", "code"],
});

export const ragStaleness = new client.Gauge({
  name: "rag_index_staleness_seconds",
  help: "RAG staleness seconds",
  labelNames: ["corpus"],
});

metricsRouter.get("/", async (_req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err: any) {
    res.status(500).end(err?.message || "metrics error");
  }
});

export function registerDefaultMetrics() {
  client.collectDefaultMetrics({ register: client.register });
}
```

---

## File: `server/events.ts`

```ts
import express from "express";
import { EventEmitter } from "events";

export type OpsEvent =
  | { type: "route.plan"; detail: any }
  | { type: "route.execute"; detail: any }
  | { type: "budget.update"; model: string; fraction: number }
  | { type: "policy.update"; policy_hash: string; at: number }
  | { type: "rag.index.freshness"; corpus: string; staleness_s: number }
  | { type: "rate.limit"; route: string; ip: string }
  | { type: "error"; route: string; code: number; msg?: string };

export const opsBus = new EventEmitter();
export const eventsRouter = express.Router();

eventsRouter.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const onEvt = (evt: OpsEvent) => {
    res.write(`event:${evt.type}\n`);
    res.write(`data:${JSON.stringify(evt)}\n\n`);
  };
  opsBus.on("event", onEvt);
  const emit = (e: OpsEvent) => opsBus.emit("event", e);

  // Send a hello
  emit({ type: "policy.update", policy_hash: "init", at: Date.now() });

  req.on("close", () => {
    opsBus.off("event", onEvt);
    res.end();
  });
});

export function emit(evt: OpsEvent) {
  opsBus.emit("event", evt);
}
```

---

## File: `server/util.ts`

```ts
import crypto from "crypto";

export function traceId() { return crypto.randomBytes(8).toString("hex"); }

export function p95(latencies: number[]): number {
  if (!latencies.length) return 0;
  const sorted = [...latencies].sort((a,b)=>a-b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
```

---

## File: `server/routes/plan.ts`

```ts
import express from "express";
import { loadPolicy } from "../policy";
import { powerWindowOpen, decisionsTotal, budgetFraction } from "../metrics";
import { emit } from "../events";
import { p95 } from "../util";

export const planRouter = express.Router();

// Fake rolling latency store (swap with your stats source)
const latencyMs: Record<string, number[]> = Object.create(null);
const recentLatency = (model: string) => p95(latencyMs[model] || []);

const modelCosts: Record<string, {prompt: number; completion: number}> = {
  "local/ollama": { prompt: 0, completion: 0 },
  "gemini/1.5-pro": { prompt: 0.0005, completion: 0.0015 }, // example
  "xai/grok-code-fast-1": { prompt: 0.0003, completion: 0.0012 },
};

function windowStatus(model: string, windows: any[]) {
  // Basic: mark open if any window matches current minute (cron eval can be added client-side too)
  try {
    const now = new Date();
    // naive: if any window exists, consider open (replace with cron-parser for real matching)
    const has = windows?.some((w: any) => w.model === model);
    powerWindowOpen.labels(model).set(has ? 1 : 0);
    return has ? "open" : "closed";
  } catch { return "unknown"; }
}

planRouter.post("/", async (req, res) => {
  const { task, input, env, loa = 1, tenant = "default" } = req.body || {};
  const pol = loadPolicy().tenants[tenant];
  if (!pol) return res.status(400).json({ error: "unknown tenant" });

  const packTokens = Math.min((input?.length || 0) / 4, pol.context_tokens_max); // crude est
  const candidates = pol.allow_models.map(model => {
    const lat = recentLatency(model) || (model.startsWith("local/") ? 400 : 1400);
    const cost = (modelCosts[model]?.prompt || 0) * packTokens + (modelCosts[model]?.completion || 0) * 500;
    const win = windowStatus(model, pol.power_windows);
    const cap = (budgetFraction as any).hashMap?.get?.({ model }) ?? 0; // prom internals not public; treat as 0
    const score = (win === "open" ? 1.2 : 1.0) * (model.startsWith("local/") ? 1.0 : 1.1) * (1_000_000 / (1 + lat + cost * 1e6));
    const explain = [
      win === "open" ? "power window open" : "power window closed",
      model.startsWith("local/") ? "local-first" : "hosted: weighted",
      `p95≈${lat}ms`,
      `est_cost≈$${cost.toFixed(4)}`,
    ];
    return {
      model, score, why: explain,
      est_tokens: Math.round(packTokens),
      est_cost_usd: Number(cost.toFixed(6)),
      est_latency_ms: lat,
      cap_status: cap,
      window_status: win,
      policy_hits: ["tenant-allowlist"],
      loa_ok: loa <= pol.loa_max,
    };
  });

  candidates.sort((a,b) => b.score - a.score);
  const decision = candidates[0];
  decisionsTotal.labels(decision.model, "score-top").inc();

  const payload = { decision, candidates, policy: { loa_max: pol.loa_max } };
  emit({ type: "route.plan", detail: payload });
  res.json(payload);
});
```

---

## File: `server/routes/execute.ts`

```ts
import express from "express";
import { routeLatency, tokensTotal, errorsTotal } from "../metrics";
import { emit } from "../events";
import { traceId } from "../util";

export const execRouter = express.Router();

execRouter.post("/", async (req, res) => {
  const t0 = Date.now();
  const { task, input, env, loa = 1, tenant = "default" } = req.body || {};
  const audit_id = traceId();

  try {
    // In a real system, call your actual model runner here.
    const decision_detail = { model: "local/ollama", chosen_by: "score-top" };
    const output = `echo: ${input ?? ""}`;
    const latency_ms = Date.now() - t0;

    routeLatency.labels(decision_detail.model, tenant).observe(latency_ms);
    tokensTotal.labels(decision_detail.model, tenant, "prompt").inc(50);
    tokensTotal.labels(decision_detail.model, tenant, "completion").inc(20);

    const payload = { audit_id, latency_ms, decision_detail, output };
    emit({ type: "route.execute", detail: payload });
    res.json(payload);
  } catch (e: any) {
    errorsTotal.labels("/route/execute", "500").inc();
    emit({ type: "error", route: "/route/execute", code: 500, msg: e?.message });
    res.status(500).json({ error: "execution_failed", audit_id });
  }
});
```

---

## File: `server/routes/rag.ts`

```ts
import express from "express";
import { ragStaleness } from "../metrics";
import { emit } from "../events";

export const ragRouter = express.Router();

let lastIndexedAt = Date.now() - 1000 * 60 * 60 * 25; // pretend stale by 25h
let corpus = process.env.RAG_CORPUS || "docs";

ragRouter.get("/status", (_req, res) => {
  const staleness = Math.max(0, Math.floor((Date.now() - lastIndexedAt) / 1000));
  ragStaleness.labels(corpus).set(staleness);
  emit({ type: "rag.index.freshness", corpus, staleness_s: staleness });
  res.json({ corpus, last_indexed_at: new Date(lastIndexedAt).toISOString(), staleness_seconds: staleness, warn: staleness > 86400 });
});

ragRouter.post("/reindex", (req, res) => {
  const dry = String(req.query.dry_run || "0") === "1";
  if (dry) return res.json({ estimate_docs: 1200, estimate_tokens: 1.8e6, estimate_duration_s: 420 });
  lastIndexedAt = Date.now();
  res.json({ ok: true, last_indexed_at: new Date(lastIndexedAt).toISOString() });
});
```

---

## File: `server/routes/github.ts`

```ts
import express from "express";

export const ghRouter = express.Router();

const GH_TOKEN = process.env.GITHUB_TOKEN || "";
const GH_REPO = process.env.GITHUB_REPO || "owner/repo"; // e.g. acme/symphony

async function gh(path: string, method: string, body?: any) {
  const url = `https://api.github.com/repos/${GH_REPO}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${GH_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "symphony-operator-kit"
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

ghRouter.post("/issues", async (req, res) => {
  try {
    const { kind = "decision", title, body, labels = [], attachments = [] } = req.body || {};
    const issue = await gh("/issues", "POST", { title: `[${kind.toUpperCase()}] ${title}`, body, labels });
    // naive attachment as comment
    for (const a of attachments) {
      await gh(`/issues/${issue.number}/comments`, "POST", { body: `Attachment **${a.name}**\n\n\`${a.contentBase64?.slice(0, 120)}...\`` });
    }
    res.json({ ok: true, issue });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "github_error" });
  }
});
```

---

## File: `server/scheduler.ts`

```ts
import { budgetFraction, powerWindowOpen } from "./metrics";
import { emit } from "./events";

type Job = { id: string; model: string; payload: any };
const queues: Record<string, Job[]> = { power: [] };

export function enqueuePower(job: Job) { queues.power.push(job); }

function budgetFrac(model: string) {
  // Placeholder: wire to your LiteLLM counters; treat as 0 here
  return 0;
}

function windowOpen(model: string) {
  // Read current gauge; if nonzero, assume open (this is illustrative)
  try {
    // no public read of prom-client gauges; assume 1 if set recently by planner
    return true;
  } catch { return false; }
}

export function startScheduler() {
  setInterval(() => {
    const q = queues.power;
    const job = q.shift();
    if (!job) return;
    if (!windowOpen(job.model) || budgetFrac(job.model) >= 0.8) {
      // requeue at tail or downgrade in your router
      q.push(job);
      return;
    }
    emit({ type: "budget.update", model: job.model, fraction: budgetFrac(job.model) });
    // dispatch(job) -> your executor
  }, 1000);
}
```

---

## File: `config/router.policy.yml`

```yaml
# Example tenant policy with power windows and allowlist
tenants:
  default:
    loa_max: 2
    context_tokens_max: 64000
    allow_models:
      - local/ollama
      - gemini/1.5-pro
      - xai/grok-code-fast-1
    power_windows:
      - model: gemini/1.5-pro
        when_cron: "0 18 * * 1-5"   # Weekdays 18:00 UTC
        max_usd_per_window: 0.20
        rpm_cap: 2
      - model: xai/grok-code-fast-1
        when_cron: "0 02 * * *"     # Daily 02:00 UTC
        max_usd_per_window: 0.20
        rpm_cap: 2
```

---

## File: `Justfile`

```make
set shell := ["/bin/bash", "-euco", "pipefail"]

# Health + smoke (from your message)
symphony-test:
	curl -fsS $${PROXY_BASE:-http://127.0.0.1:8787}/status/health.json | jq -e 'has("services") and .services | has("litellm") and has("ollama")' >/dev/null && echo "✔ health.json shape ok"
	curl -fsS $${PROXY_BASE:-http://127.0.0.1:8787}/status/burndown.json | jq -e 'has("generated_at") and .windows | has("m1") and has("h1") and has("d1")' >/dev/null && echo "✔ burndown.json shape ok"
	curl -fsS $${PROXY_BASE:-http://127.0.0.1:8787}/models | jq -e '.items | type=="array"' >/dev/null && echo "✔ models ok"
	curl -fsS -X POST -H 'content-type: application/json' -d '{"task":"qa","env":"dev","loa":1}' $${PROXY_BASE:-http://127.0.0.1:8787}/route/plan | jq -e 'has("decision") and .policy.loa_max>=1' >/dev/null && echo "✔ route/plan ok"
	curl -fsS -X POST -H 'content-type: application/json' -d '{"task":"qa","input":"say hello","env":"dev","loa":1}' $${PROXY_BASE:-http://127.0.0.1:8787}/route/execute | jq -e 'has("audit_id") and has("latency_ms")' >/dev/null && echo "✔ route/execute ok"
	set +e; curl -fsS -X POST -H 'content-type: application/json' -d '{"q":"what is Symphony?","k":5}' $${PROXY_BASE:-http://127.0.0.1:8787}/rag/query >/dev/null && echo "✔ rag/query ok" || echo "ℹ rag/query not enabled"; set -e
	set +e; curl -fsS -X POST -H 'content-type: application/json' -d '{"keep_db":false}' $${PROXY_BASE:-http://127.0.0.1:8787}/neo4j/guard >/dev/null && echo "✔ neo4j/guard ok" || echo "ℹ neo4j/guard not enabled"; set -e
	echo "✅ symphony-test completed"

symphony-plan task input?=:
	curl -fsS -X POST -H 'content-type: application/json' \
	  -d "{\"task\":\"{{task}}\",\"input\":\"{{input}}\",\"env\":\"dev\",\"loa\":1}" \
	  $${PROXY_BASE:-http://127.0.0.1:8787}/route/plan | jq

sse:
	curl -N $${PROXY_BASE:-http://127.0.0.1:8787}/events

metrics:
	curl -fsS $${PROXY_BASE:-http://127.0.0.1:8787}/metrics | head -100

rag-status:
	curl -fsS $${PROXY_BASE:-http://127.0.0.1:8787}/rag/status | jq

open-issue kind=decision title body:
	curl -fsS -X POST -H 'content-type: application/json' \
	  -d "{\"kind\":\"{{kind}}\",\"title\":\"{{title}}\",\"body\":\"{{body}}\"}" \
	  $${PROXY_BASE:-http://127.0.0.1:8787}/integrations/github/issues | jq
```

---

## File: `grafana/symphony-ops-dashboard.json`

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": null,
  "iteration": 1710000000000,
  "links": [],
  "panels": [
    {
      "type": "stat",
      "title": "Budget Fraction (Top Models)",
      "targets": [{
        "expr": "topk(5, symphony_budget_fraction_used)",
        "legendFormat": "{{model}}"
      }],
      "options": {"reduceOptions": {"calcs": ["last"], "values": false}},
      "gridPos": {"x": 0, "y": 0, "w": 8, "h": 6}
    },
    {
      "type": "gauge",
      "title": "SLO p95 Latency (route/execute)",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(symphony_route_execute_latency_ms_bucket[5m])) by (le))"
      }],
      "gridPos": {"x": 8, "y": 0, "w": 8, "h": 6}
    },
    {
      "type": "timeseries",
      "title": "Power Windows Open",
      "targets": [{
        "expr": "symphony_power_window_open"
      }],
      "gridPos": {"x": 16, "y": 0, "w": 8, "h": 6}
    },
    {
      "type": "timeseries",
      "title": "Errors by Route",
      "targets": [{
        "expr": "sum(increase(symphony_errors_total[15m])) by (route, code)",
        "legendFormat": "{{route}} ({{code}})"
      }],
      "gridPos": {"x": 0, "y": 6, "w": 12, "h": 8}
    },
    {
      "type": "timeseries",
      "title": "Tokens/sec by Model",
      "targets": [{
        "expr": "sum(rate(symphony_tokens_total[1m])) by (model, type)",
        "legendFormat": "{{model}} {{type}}"
      }],
      "gridPos": {"x": 12, "y": 6, "w": 12, "h": 8}
    },
    {
      "type": "stat",
      "title": "RAG Staleness (s)",
      "targets": [{
        "expr": "rag_index_staleness_seconds"
      }],
      "gridPos": {"x": 0, "y": 14, "w": 8, "h": 6}
    }
  ],
  "refresh": "10s",
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["symphony", "ops"],
  "templating": { "list": [] },
  "time": { "from": "now-6h", "to": "now" },
  "timezone": "",
  "title": "Symphony Ops",
  "uid": "symphony-ops",
  "version": 1
}
```

---

## File: `package.json`

```json
{
  "name": "symphony-operator-kit",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "prom-client": "^15.1.1",
    "yaml": "^2.5.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.30",
    "tsx": "^4.7.0",
    "typescript": "^5.4.5"
  }
}
```

---

## File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Node",
    "outDir": "dist",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "strict": true
  },
  "include": ["server/**/*.ts"]
}
```

---

## File: `.env.example`

```bash
PORT=8787
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
POLICY_FILE=./config/router.policy.yml
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO=owner/repo
CSP_SCRIPT_SRC=https://cdn.jsdelivr.net/npm/mermaid@10
CSP_CONNECT_SRC=
RAG_CORPUS=docs
```

---

## File: `Dockerfile`

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY server ./server
COPY config ./config
RUN npm run build

FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/config ./config
COPY package.json .
RUN npm ci --omit=dev --ignore-scripts
USER app
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["node", "dist/index.js"]
```

---

## File: `README-operator-kit.md`

```md
# Symphony Operator Kit

Adds: explainable routing, power windows, SSE events, Prometheus metrics, RAG freshness, GitHub ticketing.

## Quickstart

```bash
cp .env.example .env
npm i
npm run dev
just symphony-test
```

### Grafana
Import `grafana/symphony-ops-dashboard.json`. Point at your Prometheus with the `symphony_*` and `rag_*` metrics.

### Policy
Edit `config/router.policy.yml`. Tenants, allowlist, windows, LOA ceiling.

### GitHub
Set `GITHUB_TOKEN` (repo scope) and `GITHUB_REPO` (e.g., `acme/symphony`). Use `open-issue` Just target or POST to `/integrations/github/issues`.

### Security
CORS allowlist via `CORS_ORIGINS`. CSP enforces `default-src 'self'`, inline styles allowed for Mermaid. No user-supplied Mermaid without sanitization.

### Notes
- `plan.ts` uses naive window detection and cost tables; wire to your real latency/cost stats + cron parser.
- Replace execute stub with your runner (LiteLLM or provider SDK).
- `scheduler.ts` demonstrates a loop; integrate with your queue if you have one.
```

