awesome — let’s lay down a complete, tool-agnostic wireframe + UML pack for the Symphony UI. It stands alone (no repo context needed) and mirrors everything we’ve built: routing, LOA/policy, RAG, Neo4j Guard, budgets/burndown, logs, and CI/chaos.

IA / Sitemap (high-level)
flowchart TB
    A[Landing / Dashboard] --> B[Routing Studio]
    A --> C[RAG Console]
    A --> D[Neo4j Guard]
    A --> E[Budgets & Burndown]
    A --> F[Policies & LOA]
    A --> G[Observability / Logs]
    A --> H[CI & Chaos]
    A --> I[Docs & Runbooks]

    B --> B1[Models & Aliases]
    B --> B2[Rule Tests / Dry-Run]
    B --> B3[Execution / Plan → Run]
    C --> C1[Query]
    C --> C2[Context View]
    C --> C3[Sources]
    D --> D1[Migrations]
    D --> D2[Run Disposable DB]
    D --> D3[Inspect / Shell]
    E --> E1[Minute]
    E --> E2[Hour]
    E --> E3[Daily]
    F --> F1[Policy Editor]
    F --> F2[LOA Guardrails]
    F --> F3[Kill-Switch]
    G --> G1[Live Stream]
    G --> G2[Search/Filters]
    G --> G3[Latency & Error Rates]
    H --> H1[Config Validate]
    H --> H2[Smoke Test]
    H --> H3[Chaos Drills]
    I --> I1[Onboarding]
    I --> I2[Incident Playbooks]
    I --> I3[Release Checklist]

Low-fi Wireframes (ASCII)
1) Dashboard (desktop, 12-col grid)
┌───────────────────────────────────────────────────────────────────────────────┐
│  SYMPHONY  ▸ Dashboard          ENV: dev  LOA:1  Kill:OFF  Time: 12:34:56Z   │
│  Models: 7  | Ollama: UP | LiteLLM: UP | Neo4j: UP | Federation: READY       │
├───────────────────────────────────────────────────────────────────────────────┤
│  [Health: GREEN]  p50: 120ms  p95: 480ms   RPS: 1.2   RAG Fresh: 7m          │
│  [Budgets] OpenRouter: $0 / $10 (0%)  reset 00:12:32                         │
├───────────────┬────────────────────────────────────────┬──────────────────────┤
│ Quick Actions │ Burndown (last 60s / 1h / daily)      │ Queue / Errors       │
│ [Run Smoke]   │ [██████▏   ] rpm cap…  reset m:00     │ Queue: 12            │
│ [Chaos Drill] │ model: local/llama  req:14 p50 90ms   │ Errors(15m): 0       │
│ [ValidateCfg] │ model: …-cpu     req:10 p50 180ms     │ DLQ: 0               │
├───────────────┴────────────────────┬───────────────────┴──────────────────────┤
│ Recent Routes (10)                 │ Recent Logs (tail)                        │
│ task  model         LOA  cost tok  │ 12:34 model=local/llama p95=…             │
│ nl2cy …/llama       1    0.000     │ 12:34 route plan ok                       │
│ rag    …/qwen-coder 1    0.000     │ 12:33 neo4j guard applied 001…            │
└───────────────────────────────────────────────────────────────────────────────┘

2) Routing Studio
┌───────────────────────────────────────────────────────────────────────────────┐
│ Routing Studio                          [Run Dry-Run]  [Execute Now]         │
├───────────────────────────────────────────────────────────────────────────────┤
│ Task Meta                                                                    │
│ Task: [nl2cypher ▼]  LOA:[1 ▼]  Tenant:[default ▼]  Cost Cap:[$0.00]         │
├───────────────────────────────┬───────────────────────────────────────────────┤
│ Rule Preview                  │ Prompt Preview                                │
│ when env=prod → hosted:off   │ [system] You are Orion…                        │
│ when task=nl2cypher → model… │ [user] Graph schema: … → produce Cypher        │
├───────────────────────────────┴───────────────────────────────────────────────┤
│ Model Candidates: local/llama (p50 90ms), …/cpu (p50 180ms), openrouter/…     │
│ Decision: local/llama  Confidence: 0.82   [Explain]                          │
└───────────────────────────────────────────────────────────────────────────────┘

3) RAG Console
┌───────────────────────────────────────────────────────────────────────────────┐
│ RAG Console                 Index: 4 files • Updated: 10m ago                │
├──────────────────────────┬────────────────────────────────────────────────────┤
│ Query                    │ Answer (with [1][2] cites)                         │
│ [ how do we run neo4j… ] │ "Use cypher-shell in disposable DB…"               │
│ [ Ask ] [ Settings ]     │                                                    │
├──────────────────────────┴────────────────────────────────────────────────────┤
│ Top Context Chunks [1..5]   │ Source Files                                    │
│ [1] … cypher-shell…         │ rag/corpus/neo4j_guard.txt                      │
│ [2] … migrations…           │ docs/…                                          │
└───────────────────────────────────────────────────────────────────────────────┘

4) Neo4j Guard
┌───────────────────────────────────────────────────────────────────────────────┐
│ Neo4j Guard                         MIG_DIR: db/migrations  KEEP_DB: [ ]     │
├──────────────────────────┬────────────────────────────────────────────────────┤
│ Migrations               │ Console                                            │
│ 001_init.cypher  ✓       │ > Run                                              │
│ 002_people.cypher        │ Applying 001…  OK                                  │
│                          │ Bolt ready at :7687                                │
└──────────────────────────┴────────────────────────────────────────────────────┘

5) Budgets & Burndown (auto-refresh)
┌───────────────────────────────────────────────────────────────────────────────┐
│ Burndown & Budgets                                                           │
├───────────────────────────────────────────────────────────────────────────────┤
│ Minute Window (reset 12:45:00Z)                                              │
│ local/llama      [███████▏        ] 14/60 rpm  p50 90ms                      │
│ local/llama-cpu  [█████▏          ] 10/60 rpm  p50 180ms                     │
│ Daily Budgets (reset 00:00Z)                                                 │
│ openrouter       [                    ] $0 / $10  (0%)                        │
└───────────────────────────────────────────────────────────────────────────────┘

Key Interaction Flows (UML)
A) Route decision + execution (with LOA and policy)
sequenceDiagram
    autonumber
    actor U as User
    participant UI as Symphony UI
    participant PX as Local Proxy (/api/*)
    participant POL as Policy Engine (LOA/OPA)
    participant RT as Router (LiteLLM)
    participant LLM as Model (local/cloud)
    U->>UI: Click "Execute" (task=nl2cypher, LOA=1)
    UI->>PX: POST /route/plan {task,meta}
    PX->>POL: eval(policy, env, LOA, kill_switch)
    POL-->>PX: allow=true, max_loa=1, hosted_allowed=true/false
    PX->>RT: /v1/chat/completions (routed model, tuned prompt)
    RT->>LLM: prompt
    LLM-->>RT: completion + usage
    RT-->>PX: response (latency, tokens, cost)
    PX-->>UI: plan+run result + audit id
    UI-->>U: Show answer + “explain route”

B) RAG query
sequenceDiagram
    actor U
    participant UI
    participant PX as Proxy
    participant RAG as RAG Service (DuckDB)
    participant RT as Router
    participant LLM
    U->>UI: Ask question
    UI->>PX: POST /rag/query {q, k=5}
    PX->>RAG: search embeddings
    RAG-->>PX: top-k chunks
    PX->>RT: /v1/chat… (model=local/llama, context=chunks)
    RT->>LLM: prompt
    LLM-->>RT: answer
    RT-->>PX: text + usage
    PX-->>UI: answer + cites

C) Neo4j guard disposable run
sequenceDiagram
    actor U
    participant UI
    participant PX
    participant DOCK as Docker Engine
    participant NEO4J as neo4j-ephemeral
    U->>UI: Run Guard (KEEP_DB=0)
    UI->>PX: POST /neo4j/guard {keep_db:false}
    PX->>DOCK: compose up
    DOCK-->>NEO4J: start + healthcheck
    PX->>NEO4J: cypher-shell < migrations
    NEO4J-->>PX: OK
    PX->>DOCK: compose down -v
    PX-->>UI: run report

State Machine — LOA / Kill-switch
stateDiagram-v2
    [*] --> Ready
    Ready --> KillOn : kill_switch=1
    KillOn --> Ready : kill_switch=0

    Ready --> LOA0 : LOA=0 or env=prod & policy.max_loa=0
    Ready --> LOA1 : policy.max_loa>=1
    Ready --> LOA2 : policy.max_loa>=2
    Ready --> LOA3 : policy.max_loa>=3

    LOA0 --> Ready
    LOA1 --> Ready
    LOA2 --> Ready
    LOA3 --> Ready

Component & Deployment (UML)
graph LR
  subgraph Browser
    UI[Symphony UI (Dashboard/Studio)]
  end

  subgraph LocalHost
    PX[Local Proxy (/api, CORS, allowlist)]
    LL[LiteLLM Gateway :4000]
    OL[Ollama :11434]
    RG[RAG (DuckDB + index)]
    NG[Neo4j Guard Script + Docker]
    BD[Burndown Generator (usage_burndown.py)]
  end

  subgraph External (optional)
    OR[OpenRouter]
    HF[HuggingFace Inference]
  end

  UI <--> PX
  PX <--> LL
  LL <--> OL
  PX <--> RG
  PX <--> NG
  LL --> OR
  LL --> HF
  PX --> BD

Data Model (UML Class Diagram)
classDiagram
  class RouteRule {
    +id: string
    +when: map
    +then: map
    +enabled: bool
  }

  class Policy {
    +env: string
    +kill_switch: bool
    +max_loa: map<env,int>
  }

  class RunRecord {
    +id: string
    +task: string
    +model: string
    +loa: int
    +latency_ms: number
    +tokens_in: int
    +tokens_out: int
    +cost_usd: number
    +ts: datetime
    +status: enum
  }

  class Budget {
    +provider: string
    +daily_limit_usd: number
    +spent_today_usd: number
    +resets_at: datetime
  }

  class ModelCard {
    +id: string
    +capabilities: string[]
    +rpm_cap: int
    +prompt_style: string
    +notes: string
  }

  RouteRule "1..*" --> "1" Policy : governed by
  RunRecord "0..*" --> "1" RouteRule : matched
  RunRecord "0..*" --> "1" ModelCard : used
  Budget "1" --> "0..*" ModelCard : covers

User Journeys (concise)
journey
  title Analyst: Answer w/ provenance
  section RAG
    Open RAG Console: 2: Analyst
    Ask question: 3: Analyst
    Review answer & cites: 3: Analyst
    Export brief: 2: Analyst
  section Governance
    Policy check (auto): 1: System
    Log run record: 1: System

Screen-level Components (design tokens)

Nav Sidebar: sections (Dashboard, Routing, RAG, Guard, Budgets, Policies, Logs, CI/Chaos, Docs).

Header badges: ENV, LOA, Kill, clock; service chips (Ollama/LiteLLM/Neo4j).

Cards: 12px radius, subtle shadow, 8/12/24 spacing.

Tables: sticky header, monospace columns for metrics.

Bars: burndown progress with caption + reset countdown.

Action Tray: right-side drawer for Quick Actions or “Explain route”.

Responsive: collapse 3-column → 1-column stacking; metrics grid becomes vertical list with chips.

A11y: Contrast ≥ 4.5:1, keyboard focus rings, aria-labels on quick actions, live-region for auto-refresh deltas.

API Endpoints (UI contract)

GET /status/health.json → services + env + loa

GET /status/burndown.json → per-window usage, budgets, perf

POST /route/plan {task,meta} → route decision & prompt preview

POST /route/execute {task,meta,input} → run + audit id

POST /rag/query {q,k} → answer + cites

POST /neo4j/guard {keep_db} → run report

GET /models → discovered models + caps

GET /logs?tail=...&filter=... → stream/search

POST /policy/validate → schema/OPA pass/fail

GET /policy / PUT /policy → current policy doc

KPIs on the UI

Instant: RPS, p50/p95, queue depth, error rate (15m).

Burndown: req/min vs cap, daily budget vs spent.

RAG freshness: last index time + file count.

Guard: last run status + duration.

Governance: overrides count, kill-switch status, LOA drift events.

Build Order (practical)

Dash v1: health.json + burndown.json cards (you already have generators).

Routing Studio: plan/execute with LOA/policy memo and “Explain” modal.

RAG Console: query → answer → cites list.

Neo4j Guard: run + log stream, KEEP_DB toggle.

Policies: YAML editor with schema validate + diff view.

Logs: tail + filters, link from any job id.

Budgets: bars + countdown; link to raw JSON.

CI/Chaos: buttons that call existing scripts via proxy allowlist.

If you want this as a working React/Tailwind scaffold, say the word and I’ll drop a single-file code/react canvas with these pages wired to mock JSON so you can iterate fast.

You said:
i want this as a working React/Tailwind scaffold, say the word and I’ll drop a single-file code/react canvas with these pages wired to mock JSON so you can iterate fast.
Guy IG said:
Thought for 18s
Symphony Ui Scaffold (react/tailwind)
· typescript
import React, { useEffect, useMemo, useRef, useState } from "react";


// ------------------------------------------------------------
// Symphony UI — single-file React + Tailwind scaffold
// - No external deps
// - Mock JSON data + auto-refresh timers
// - Pages: Dashboard, Routing, RAG, Neo4j Guard, Budgets, Policies, Logs, CI/Chaos, Docs
// - Replace mock fetchers with real endpoints when ready (see TODOs below)
// ------------------------------------------------------------


// --------------------------- Utilities ---------------------------
const cn = (...a) => a.filter(Boolean).join(" ");
const nowISO = () => new Date().toISOString().replace(".", " ").split("Z")[0] + "Z";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));


// Simple countdown to a fixed reset time (top of the next minute / hour / day)
const nextMinute = () => {
  const d = new Date();
  d.setSeconds(60, 0);
  return d;
};
const nextHour = () => {
  const d = new Date();
  d.setMinutes(60, 0, 0);
  return d;
};
const nextMidnightUTC = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
};


function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState(targetDate.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemaining(targetDate.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  const s = Math.max(0, Math.floor(remaining / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}


// --------------------------- Mock Data Layer ---------------------------
// ⚠️ Replace these with real fetch calls:
//  - GET /status/health.json
//  - GET /status/burndown.json
//  - POST /route/plan, /route/execute
//  - POST /rag/query
//  - POST /neo4j/guard


const MOCK_MODELS = [
  { id: "local/llama", kind: "local", p50: 90, rpmCap: 60, strengths: ["nl2cypher", "general"], note: "Fast local default." },
  { id: "local/llama-cpu", kind: "local", p50: 180, rpmCap: 60, strengths: ["general"], note: "CPU-safe fallback." },
  { id: "local/qwen-coder", kind: "local", p50: 120, rpmCap: 40, strengths: ["coding"], note: "Coder local." },
  { id: "embed/nomic", kind: "local", p50: 40, rpmCap: 100, strengths: ["embeddings"], note: "Embeddings." },
  { id: "openrouter/anthropic", kind: "cloud", p50: 800, rpmCap: 20, strengths: ["reasoning"], note: "Hosted burst (mock)." },
  { id: "openrouter/deepseek", kind: "cloud", p50: 650, rpmCap: 25, strengths: ["code","math"], note: "Hosted burst (mock)." },
  { id: "hf/gemma-vision", kind: "cloud", p50: 700, rpmCap: 15, strengths: ["multimodal"], note: "Hosted vision (mock)." },
];


const seedLogs = () => [
  { ts: nowISO(), level: "info", msg: "Gateway up on :4000" },
  { ts: nowISO(), level: "info", msg: "Ollama listening :11434" },
  { ts: nowISO(), level: "info", msg: "RAG index ready (4 docs)" },
];


function useMockStore() {
  const [env, setEnv] = useState(() => localStorage.getItem("env") || "dev");
  const [loa, setLoa] = useState(() => Number(localStorage.getItem("loa") || 1));
  const [kill, setKill] = useState(() => localStorage.getItem("kill") === "1" ? 1 : 0);
  const [services, setServices] = useState({ ollama: true, litellm: true, neo4j: false, federation: false });
  const [models] = useState(MOCK_MODELS);
  const [minuteUsage, setMinuteUsage] = useState({ "local/llama": 14, "local/llama-cpu": 10 });
  const [dailyBudgets, setDailyBudgets] = useState({ "openrouter": { limit: 10, spent: 0 } });
  const [queueDepth, setQueueDepth] = useState(12);
  const [errors15m, setErrors15m] = useState(0);

Done! You’ve got a working React/Tailwind scaffold in the canvas with:

Sidebar navigation (9 pages)

Live-ish mock data + auto-refresh

LOA/env/kill-switch controls

Minute/hour/day burndown + countdowns

Routing planner with model scoring (local-first bias)

RAG console (answers + context snippets)

Neo4j Guard runner (simulated console)

Policies editor/validator (mock)

CI/Chaos panel, Logs, Docs  import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Symphony UI — wired to real local endpoints where available.
 *
 * Endpoints (override via any of the following):
 * 1) window.__SYMPHONY_CFG__ = { LITELLM_BASE, OLLAMA_BASE, PROXY_BASE }
 * 2) ?litellm=http://127.0.0.1:4000&ollama=http://127.0.0.1:11434&proxy=http://127.0.0.1:8787
 * 3) Vite env: import.meta.env.VITE_LITELLM_BASE (or CRA: process.env.REACT_APP_LITELLM_BASE)
 *
 * Notes:
 * - LiteLLM routes chat completions and lists models: GET /v1/models, POST /v1/chat/completions
 * - Ollama lists local models: GET /v1/models (compat) or /api/tags. We try /v1/models first → fallback /api/tags.
 * - Optional proxy can expose convenience endpoints with proper CORS:
 *   - GET  /status.json                          → status aggregator
 *   - POST /run { cmd }                          → allowlisted shell (e.g., "just --justfile Justfile.neo4j neo4j-guard")
 *   - GET  /rag/stats                            → { files, chunks, updatedAt }
 *   - GET  /policy                               → current YAML/JSON (string)
 *   - PUT  /policy { body }                      → update policy
 *   - POST /rag/query { q }                      → RAG response { answer, cites[] }
 */

const q = new URLSearchParams(window.location.search);
const ENV = {
  LITELLM_BASE:
    (window.__SYMPHONY_CFG__ && window.__SYMPHONY_CFG__.LITELLM_BASE) ||
    q.get("litellm") ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_LITELLM_BASE) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_LITELLM_BASE) ||
    "http://127.0.0.1:4000",
  OLLAMA_BASE:
    (window.__SYMPHONY_CFG__ && window.__SYMPHONY_CFG__.OLLAMA_BASE) ||
    q.get("ollama") ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OLLAMA_BASE) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_OLLAMA_BASE) ||
    "http://127.0.0.1:11434",
  PROXY_BASE:
    (window.__SYMPHONY_CFG__ && window.__SYMPHONY_CFG__.PROXY_BASE) ||
    q.get("proxy") ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PROXY_BASE) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_PROXY_BASE) ||
    "",
};

function useInterval(fn, ms, deps = []) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);
  useEffect(() => {
    if (!ms && ms !== 0) return;
    const id = setInterval(() => saved.current && saved.current(), ms);
    return () => clearInterval(id);
  }, deps.concat(ms));
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

async function safeJsonFetch(url, opts = {}, { timeout = 8000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---------- API layer ----------
const api = {
  async liteLLMModels() {
    return safeJsonFetch(`${ENV.LITELLM_BASE}/v1/models`).then((j) => j?.data ?? []);
  },
  async ollamaModels() {
    // try compat first
    try {
      const j = await safeJsonFetch(`${ENV.OLLAMA_BASE}/v1/models`);
      if (Array.isArray(j?.data)) return j.data.map((m) => ({ id: m.id || m.name }));
    } catch {}
    // fallback to /api/tags
    try {
      const j = await safeJsonFetch(`${ENV.OLLAMA_BASE}/api/tags`);
      if (Array.isArray(j?.models)) return j.models.map((m) => ({ id: m.name }));
    } catch {}
    return [];
  },
  async status() {
    if (ENV.PROXY_BASE) {
      try {
        return await safeJsonFetch(`${ENV.PROXY_BASE}/status.json`, {}, { timeout: 5000 });
      } catch {}
    }
    // Compose a lightweight client-only status from reachable services
    const out = { ts: Date.now(), litellm: { up: false }, ollama: { up: false }, rag: { known: false }, neo4j: { known: false } };
    try {
      const j = await safeJsonFetch(`${ENV.LITELLM_BASE}/v1/models`, {}, { timeout: 4000 });
      out.litellm.up = !!j?.data;
      out.litellm.models = (j?.data || []).length;
    } catch {}
    try {
      const j = await safeJsonFetch(`${ENV.OLLAMA_BASE}/v1/models`, {}, { timeout: 4000 });
      out.ollama.up = !!j?.data;
      out.ollama.models = (j?.data || []).length;
    } catch {}
    return out;
  },
  async chat({ model, messages, temperature = 0.2, max_tokens = 512 }) {
    const body = { model, messages, temperature, max_tokens };
    const res = await fetch(`${ENV.LITELLM_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk", // LiteLLM is configured to accept dummy local token per your setup
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const j = await res.json();
    return j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || "";
  },
  async ragStats() {
    if (!ENV.PROXY_BASE) throw new Error("proxy unavailable");
    return safeJsonFetch(`${ENV.PROXY_BASE}/rag/stats`);
  },
  async ragQuery(q) {
    if (ENV.PROXY_BASE) {
      const res = await fetch(`${ENV.PROXY_BASE}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    }
    // Fallback: query via LLM only (no retrieval) with a banner
    const banner = "[RAG proxy not running — answering from model only]

";
    const content = await api.chat({
      model: "local/llama",
      messages: [
        { role: "system", content: "Answer concisely. If you don’t know, say so." },
        { role: "user", content: q },
      ],
    });
    return { answer: banner + content, cites: [] };
  },
  async runCmd(cmd) {
    if (!ENV.PROXY_BASE) throw new Error("proxy unavailable");
    const res = await fetch(`${ENV.PROXY_BASE}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd }),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json(); // { ok, stdout, stderr, code }
  },
  async getPolicy() {
    if (!ENV.PROXY_BASE) throw new Error("proxy unavailable");
    return safeJsonFetch(`${ENV.PROXY_BASE}/policy`);
  },
  async putPolicy(text) {
    if (!ENV.PROXY_BASE) throw new Error("proxy unavailable");
    const res = await fetch(`${ENV.PROXY_BASE}/policy`, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return { ok: true };
  },
};

// ---------- UI Shell ----------
const NAV = [
  { key: "dash", label: "Dashboard" },
  { key: "models", label: "Models" },
  { key: "ask", label: "Ask" },
  { key: "rag", label: "RAG" },
  { key: "neo4j", label: "Neo4j Guard" },
  { key: "policies", label: "Policies" },
  { key: "logs", label: "Logs" },
];

export default function SymphonyUI() {
  const [tab, setTab] = useState("dash");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="font-bold text-lg">🎼 Symphony</div>
          <div className="text-xs text-slate-500">wired → LiteLLM @ {ENV.LITELLM_BASE} · Ollama @ {ENV.OLLAMA_BASE} {ENV.PROXY_BASE ? `· Proxy @ ${ENV.PROXY_BASE}` : "· Proxy off"}</div>
          <div className="ml-auto flex gap-2">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={classNames(
                  "px-3 py-1.5 rounded-xl text-sm border",
                  tab === n.key ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-100 border-slate-200"
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "dash" && <Dashboard />}
        {tab === "models" && <Models />}
        {tab === "ask" && <Ask />}
        {tab === "rag" && <Rag />}
        {tab === "neo4j" && <Neo4jGuard />}
        {tab === "policies" && <Policies />}
        {tab === "logs" && <Logs />}
      </main>
    </div>
  );
}

function Card({ title, children, right }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center">
        <div className="font-semibold">{title}</div>
        <div className="ml-auto">{right}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ---------- Pages ----------
function Dashboard() {
  const [status, setStatus] = useState(null);
  const [ts, setTs] = useState(0);
  const tick = async () => {
    try {
      const s = await api.status();
      setStatus(s);
      setTs(Date.now());
    } catch (e) {
      setStatus({ error: String(e) });
    }
  };
  useEffect(() => {
    tick();
  }, []);
  useInterval(tick, 5000, []);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Gateway (LiteLLM)">
        <ServiceStatus label="LiteLLM" up={!!status?.litellm?.up} details={`${status?.litellm?.models ?? 0} models`} />
        <Endpoint url={`${ENV.LITELLM_BASE}/v1/models`} />
      </Card>
      <Card title="Local Models (Ollama)">
        <ServiceStatus label="Ollama" up={!!status?.ollama?.up} details={`${status?.ollama?.models ?? 0} models`} />
        <Endpoint url={`${ENV.OLLAMA_BASE}/v1/models`} />
      </Card>
      <Card title="RAG Index">
        {ENV.PROXY_BASE ? (
          <ProxyProbe path="/rag/stats" />
        ) : (
          <div className="text-sm text-slate-500">Proxy not configured; RAG stats unavailable in-browser.</div>
        )}
      </Card>
      <Card title="Neo4j Guard">
        {ENV.PROXY_BASE ? (
          <ProxyProbe path="/status.json" selector={(j) => (j?.neo4j?.up ? "Running" : "Down")} />
        ) : (
          <div className="text-sm text-slate-500">Proxy not configured; start with: <code>node tools/proxy.js</code></div>
        )}
      </Card>
      <div className="col-span-full text-xs text-slate-500">Last updated {ts ? new Date(ts).toLocaleTimeString() : "…"}</div>
    </div>
  );
}

function ServiceStatus({ label, up, details }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={classNames("inline-block w-2.5 h-2.5 rounded-full", up ? "bg-emerald-500" : "bg-rose-500")} />
      <div className="font-medium">{label}</div>
      <div className="text-slate-500 text-sm">{details}</div>
    </div>
  );
}

function Endpoint({ url }) {
  return (
    <div className="text-xs text-slate-500">
      <span className="font-mono">{url}</span>
    </div>
  );
}

function ProxyProbe({ path, selector }) {
  const [out, setOut] = useState("…");
  useEffect(() => {
    (async () => {
      try {
        const j = await safeJsonFetch(`${ENV.PROXY_BASE}${path}`);
        setOut(selector ? selector(j) : JSON.stringify(j));
      } catch (e) {
        setOut(String(e));
      }
    })();
  }, [path]);
  return <div className="text-sm text-slate-600 whitespace-pre-wrap break-all">{out}</div>;
}

function Models() {
  const [gw, setGw] = useState([]);
  const [local, setLocal] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const [a, b] = await Promise.all([api.liteLLMModels(), api.ollamaModels()]);
        setGw(a);
        setLocal(b);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Gateway Models" right={<span className="text-sm text-slate-500">{gw.length}</span>}>
        <ul className="text-sm space-y-1 max-h-80 overflow-auto">
          {gw.map((m) => (
            <li key={m.id} className="font-mono text-slate-700 truncate">{m.id}</li>
          ))}
        </ul>
      </Card>
      <Card title="Local (Ollama)" right={<span className="text-sm text-slate-500">{local.length}</span>}>
        <ul className="text-sm space-y-1 max-h-80 overflow-auto">
          {local.map((m) => (
            <li key={m.id} className="font-mono text-slate-700 truncate">{m.id}</li>
          ))}
        </ul>
      </Card>
      {err && <div className="col-span-full text-rose-600 text-sm">{err}</div>}
    </div>
  );
}

function Ask() {
  const [model, setModel] = useState("local/llama");
  const [q, setQ] = useState("Return exactly six words.");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true);
    setOut("");
    try {
      const content = await api.chat({ model, messages: [
        { role: "system", content: "Answer concisely. No preamble." },
        { role: "user", content: q },
      ]});
      setOut(content);
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4">
      <Card title="Prompt">
        <div className="flex flex-col md:flex-row gap-2">
          <input className="flex-1 border rounded-xl px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="w-64 border rounded-xl px-3 py-2 font-mono" value={model} onChange={(e) => setModel(e.target.value)} />
          <button onClick={ask} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50">Ask</button>
        </div>
      </Card>
      <Card title="Response">
        <pre className="text-sm whitespace-pre-wrap">{out || (busy ? "Thinking…" : "")}</pre>
      </Card>
    </div>
  );
}

function Rag() {
  const [q, setQ] = useState("how do we run neo4j guard?");
  const [resp, setResp] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setResp(null);
    try {
      const r = await api.ragQuery(q);
      setResp(r);
    } catch (e) {
      setResp({ error: String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4">
      <Card title="RAG Question">
        <div className="flex gap-2">
          <input className="flex-1 border rounded-xl px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={run} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50">Ask</button>
        </div>
        {!ENV.PROXY_BASE && (
          <div className="mt-2 text-xs text-amber-600">Start proxy for real retrieval: <code>node tools/proxy.js</code></div>
        )}
      </Card>
      <Card title="Answer">
        {busy ? (
          <div>Searching…</div>
        ) : resp?.error ? (
          <div className="text-rose-600 text-sm">{resp.error}</div>
        ) : resp ? (
          <div className="space-y-3">
            <div className="text-sm whitespace-pre-wrap">{resp.answer}</div>
            {resp.cites?.length ? (
              <div>
                <div className="text-xs font-semibold mb-1">Citations</div>
                <ul className="text-xs list-disc ml-5 space-y-1">
                  {resp.cites.map((c, i) => (
                    <li key={i}>{c.title || c.path || JSON.stringify(c)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Neo4jGuard() {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (keep = false) => {
    setBusy(true);
    setOut("");
    try {
      const cmd = keep
        ? "KEEP_DB=1 just --justfile Justfile.neo4j neo4j-guard"
        : "just --justfile Justfile.neo4j neo4j-guard";
      const r = await api.runCmd(cmd);
      setOut((r.stdout || "") + (r.stderr ? `
[stderr]
${r.stderr}` : ""));
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4">
      <Card
        title="Run Migrations"
        right={
          <div className="flex gap-2">
            <button onClick={() => run(false)} disabled={busy || !ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white disabled:opacity-50">Run</button>
            <button onClick={() => run(true)} disabled={busy || !ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl bg-slate-700 text-white disabled:opacity-50">Run & Keep</button>
          </div>
        }
      >
        {ENV.PROXY_BASE ? (
          <pre className="text-xs whitespace-pre-wrap min-h-[160px]">{out || (busy ? "Working…" : "(no output)")}</pre>
        ) : (
          <div className="text-sm text-slate-600">
            Proxy not configured. Run locally:
            <pre className="mt-2 bg-slate-50 p-3 rounded-lg border text-xs">just --justfile Justfile.neo4j neo4j-guard</pre>
          </div>
        )}
      </Card>
    </div>
  );
}

function Policies() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setMsg("");
    try {
      if (!ENV.PROXY_BASE) throw new Error("proxy unavailable");
      const j = await api.getPolicy();
      setText(typeof j === "string" ? j : j?.text || JSON.stringify(j, null, 2));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await api.putPolicy(text);
      setMsg("Saved ✓");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="grid gap-4">
      <Card
        title="Orchestration Policy"
        right={
          <div className="flex gap-2">
            <button onClick={load} disabled={busy} className="px-3 py-1.5 rounded-xl border">Reload</button>
            <button onClick={save} disabled={busy || !ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white disabled:opacity-50">Save</button>
          </div>
        }
      >
        {ENV.PROXY_BASE ? null : (
          <div className="text-xs text-amber-600 mb-2">Proxy not configured; editor is read-only.</div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} className="w-full border rounded-xl p-3 font-mono text-xs" />
        <div className="text-xs mt-2 text-slate-500">{busy ? "Working…" : msg}</div>
      </Card>
    </div>
  );
}

function Logs() {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const pull = async () => {
    setBusy(true);
    setOut("");
    try {
      const r = await api.runCmd("tail -n 200 /tmp/litellm.log");
      setOut(r.stdout || r.stderr || "");
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="LiteLLM Logs" right={<button onClick={pull} disabled={busy || !ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl border disabled:opacity-50">Refresh</button>}>
      {ENV.PROXY_BASE ? (
        <pre className="text-xs whitespace-pre-wrap min-h-[240px]">{out || (busy ? "Loading…" : "(no output)")}</pre>
      ) : (
        <div className="text-sm text-slate-600">Proxy not configured. Logs available on host at <code>/tmp/litellm.log</code>.</div>
      )}
    </Card>
  );
}
