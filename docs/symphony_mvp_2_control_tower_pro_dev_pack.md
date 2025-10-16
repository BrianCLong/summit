# Symphony MVP‑2 — Control Tower “Pro” (Dev Pack)

A single, copy‑pasteable package for your dev team: **(A)** hosted‑model windows to encode now, **(B)** a fully‑formed MVP‑2 system prompt, and **(C)** drop‑in configs/snippets (policy windows/quotas, Slack & PagerDuty alerts, VS Code/Copilot wiring, per‑prompt tunability, web‑ingest connector, and GH↔Jira parity). Includes an acceptance checklist and demo script.

> **Timezone:** All clocks and examples below are expressed in **America/Denver** and should auto‑handle DST.

---

## A) Hosted‑model windows to encode first (Denver)

These are _operational encodes_ that balance vendor guidance with rolling/observed behavior. Where exact resets aren’t published, encode as **rolling headers/meter‑driven** and expose the reset time in the UI.

| Provider / Plan                | Window type                                                        | Reset basis                                  | Denver encoding                                                                                                                  | Notes                                                                                        |
| ------------------------------ | ------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **ChatGPT Plus (OpenAI)**      | **Rolling (per‑model)** + Daily/Weekly counters for certain models | In‑product meters; counters change over time | Treat Plus chat as **rolling** (3h‑style windows per model, where applicable); also support daily/weekly counters where surfaced | Use a **sentinel** that reads visible meters/“resets at” copy; never hard‑code exact counts. |
| **Claude Pro/Max (Anthropic)** | **Rolling 5‑hour session** (+ optional weekly caps)                | Vendor help center                           | Encode **rolling_5h**; allow optional weekly cap                                                                                 | Phase‑lock to observed reset once detected.                                                  |
| **Gemini (API)**               | **Fixed daily**                                                    | 00:00 **US Pacific** (PT)                    | 01:00 Denver (PT+1)                                                                                                              | Encode as **daily_pacific_00**; handle DST automatically.                                    |
| **Gemini (Apps/Advanced)**     | Dynamic replenishment                                              | In‑product messaging                         | Mirror API daily reset **by default**, fall back to UI meter polling                                                             | Display clock as “heuristic” badge until confirmed.                                          |
| **Grok (xAI)**                 | Rolling                                                            | API/headers                                  | Encode **header‑driven** (x‑ratelimit‑reset‑\*)                                                                                  | Prefer header values over heuristics.                                                        |
| **Perplexity API**             | Fixed per‑minute                                                   | API                                          | Encode **fixed_every: 60s**                                                                                                      | For app use, treat as rolling 24h with account meter polling.                                |
| **DeepSeek API**               | Dynamic throttling                                                 | API                                          | Encode **dynamic (header/meter‑driven)**                                                                                         | Backoff on 429/5xx.                                                                          |
| **Venice**                     | Rolling                                                            | API headers                                  | Encode **header‑driven**                                                                                                         | Normalized as OpenAI‑compatible.                                                             |

**Starter power‑windows (scheduler hints)** — shift automatically when a reset is learned:

```yaml
# operator-kit/config/model.windows.yml
timezone: America/Denver
models:
  chatgpt_plus:
    schedule:
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '06:05',
          duration: '00:25',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '09:05',
          duration: '00:25',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '12:05',
          duration: '00:25',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '15:05',
          duration: '00:25',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '18:05',
          duration: '00:25',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '21:05',
          duration: '00:25',
        }
    dynamic: { detector: chatgpt_ui, action: shift_to_next_reset }

  claude_pro:
    schedule:
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '05:00',
          duration: '00:55',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '10:00',
          duration: '00:55',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '15:00',
          duration: '00:55',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '20:00',
          duration: '00:55',
        }
    dynamic: { detector: claude_ui, action: phase_lock }

  gemini_api:
    schedule:
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '01:05',
          duration: '01:30',
        }
      - {
          days: [Mon, Tue, Wed, Thu, Fri, Sat, Sun],
          at: '13:00',
          duration: '00:30',
        }

  grok_live_search:
    schedule:
      - { days: [Mon, Tue, Wed, Thu, Fri], at: '08:30', duration: '00:20' }
      - { days: [Mon, Tue, Wed, Thu, Fri], at: '16:30', duration: '00:20' }

  perplexity_sonar:
    schedule:
      - { days: [Mon, Tue, Wed, Thu, Fri], at: '08:00', duration: '00:30' }
      - { days: [Mon, Tue, Wed, Thu, Fri], at: '13:30', duration: '00:20' }

  deepseek_api:
    schedule:
      - { days: [Mon, Tue, Wed, Thu, Fri], at: '11:00', duration: '00:30' }

  venice_api:
    schedule:
      - { days: [Mon, Tue, Wed, Thu, Fri], at: '14:00', duration: '00:20' }
```

**UI expectations**

- Show **window clocks** per provider (+ “learned from telemetry” chip when drift adjuster updates).
- Prefer hosted models **inside** windows; outside windows, **fallback** to locals/cheaper.
- Keep **reserve_fraction** (e.g., 20%) to avoid hard cap‑cliffs.

---

## B) MVP‑2 System Prompt (drop‑in)

Paste this as the **system** instructions for your router/planner service.

```md
SYSTEM — Symphony Control Tower (MVP‑2)

MISSION
Maximize throughput, quality, and cost‑efficiency across local + hosted models and approved web interfaces while honoring budgets, usage windows, SLOs, and governance. Prefer local/cheaper unless evidence indicates otherwise. Enforce LOA/Kill, cite sources when the web is used, and auto‑ticket on SLO breach.

OUTPUT CONTRACT
Return JSON per run:
{
"answer": "…",
"citations": [],
"controls": {},
"audit": {},
"tickets": [],
"logs": []
}

- `controls` must echo the actual knobs used (see CONTROL SURFACE).
- Put raw fetch/scrape snippets only in `logs`; summarize in `answer`.

CONTROL SURFACE (must honor)

- model: { id, provider, reason }
- sampling: { temperature, top_p, max_tokens }
- cost_guard: { usd_cap, stop_on_cap }
- retry: { max_attempts, backoff_s }
- safety: { loa:int, allow_hosted:boolean }
- web: {
  allow, strategy: "search"|"visit"|"scrape"|"none",
  domains_allow:[], depth:0..2, timeout_s:30..120, max_docs:1..20,
  headless:{ screenshots:boolean, viewport:"desktop"|"mobile" },
  respect_robots:true, citation_mode:"url|title|hash", cache_ttl_s:3600
  }
- windows: { chatgpt:{rolling:true}, claude:{rolling_5h:true}, gemini:{daily_pacific_00:true} }
- vs_code: { commands:["apply_edit","new_file","run_test","open_diff"], copilot_mode:"coexist"|"prefer_copilot"|"prefer_symphony" }
- github_jira: { auto_ticket:true, repo:"org/name", project_key:"ENG", labels:["ai","symphony"], link_prs:true }

OPERATING RULES

1. Evidence‑first: do minimal web retrieval; **cite** non‑trivial facts.
2. Web use: public pages only; respect robots/TOS; prefer official docs/APIs; capture URL + timestamp; optionally keep a signed HTML snapshot.
3. Cost/SLO: stop when `usd_cap` would be exceeded and emit partials; target p95 if `slo_ms` set; degrade gracefully.
4. Privacy: never leak secrets/PII; redact in logs.
5. Windows: if a hosted window is depleted/closed, down‑rank it and log the decision.

ACTION SPACE

- search(query, domain?)
- visit(url)
- scrape(url, selectors?)
- llm(prompt, model, sampling)
- code_action(vscode_command, args)
- ticket(kind, title, body, fields)
- log(text)

AUTO‑TICKETS

- On SLO breach or blocked dependency → incident tickets in GitHub **and** Jira; labels ["slo","auto"].

RETURN EXAMPLE
{
"answer":"…",
"citations":[{"title":"Rate limits","url":"https://…"}],
"controls":{"model":{"id":"local/llama"},"web":{"allow":true,"strategy":"search","domains_allow":["openai.com","support.anthropic.com","ai.google.dev"],"depth":1,"timeout_s":45,"max_docs":5}},
"audit":{"latency_ms":1320,"cost_usd":0.0034,"model_usage":{"prompt_tokens":512,"completion_tokens":210}},
"tickets":[{"system":"github","id":"#1234","url":"https://github.com/…"}],
"logs":["searched site:ai.google.dev gemini rate limits","visited …"]
}

END SYSTEM
```

---

## C) Drop‑in configs & snippets

### 1) Router policy: windows, quotas, and per‑work‑unit overrides

```yaml
# operator-kit/config/router.policy.yml
policy:
  version: 2
  defaults:
    stream: true
    reserve_fraction: 0.20
    max_sla_ms: 6000
  models:
    - name: openai/chatgpt-plus
      class: hosted
      quota:
        type: rolling
        window: 3h # heuristic; prefer UI/headers when available
        unit: messages
        cap: from_console # leave dynamic
      allow_tasks: [chat, ideation, code-review]
      loa_max: 1

    - name: google/gemini-pro
      class: hosted
      quota:
        type: fixed
        period: daily
        tz: America/Los_Angeles
        units:
          rpd: from_console
          tpd: from_console
      allow_tasks: [analysis, research, vision]
      loa_max: 1

    - name: anthropic/claude-pro
      class: hosted
      quota:
        type: rolling
        window: 5h
        unit: messages
        weekly_cap: optional
      allow_tasks: [writing, code, qa]
      loa_max: 1

    - name: xai/grok
      class: hosted
      quota:
        {
          type: rolling,
          window: header_driven,
          unit: requests,
          cap: from_headers,
        }
      loa_max: 1

    - name: perplexity/api
      class: hosted
      quota: { type: fixed_every, period: 60s, unit: requests }
      loa_max: 0

    - name: deepseek/api
      class: hosted
      quota: { type: dynamic }
      loa_max: 0

    - name: venice/api
      class: hosted
      quota:
        {
          type: rolling,
          window: header_driven,
          unit: requests,
          cap: from_headers,
        }
      loa_max: 0

  routing_rules:
    - match: { task: qa, loa: 1 }
      route:
        prefer: [openai/chatgpt-plus, anthropic/claude-pro]
        fallback: [google/gemini-pro]
        max_cost_usd: 0.50
        stream: true
        context_budget_tokens: 32000

work_unit_overrides_schema:
  tokens_max: int
  context_budget_tokens: int
  temperature: { min: 0.0, max: 1.5 }
  streaming: bool
  tools_allowed: [browser, code, graph]
  cost_ceiling_usd: float
  provider_hints: [openai, anthropic, google, xai, perplexity, venice, deepseek]
```

### 2) Alertmanager → Slack & PagerDuty (auto‑ticket is **ON**)

```yaml
# alerting/alertmanager.yml
route:
  receiver: 'slack_and_pd'
receivers:
  - name: 'slack_and_pd'
    slack_configs:
      - api_url: ${SLACK_WEBHOOK_URL}
        channel: '#symphony-alerts'
        title: '[SLO] {{ .CommonLabels.alertname }} {{ .CommonLabels.severity }}'
        text: |-
          *Firing:* {{ .CommonAnnotations.summary }}
          *Model:* {{ index .CommonLabels "model" | default "n/a" }}
          *p95:* {{ index .CommonLabels "quantile" | default "0.95" }}
          *Budget:* {{ with $v := .Alerts.Firing }}{{ (index $v 0).Annotations.budget }}{{ end }}
          *Audit:* {{ with $v := .Alerts.Firing }}{{ (index $v 0).Annotations.audit_id }}{{ end }}
    pagerduty_configs:
      - routing_key: ${PAGERDUTY_ROUTING_KEY}
        severity: '{{ .CommonLabels.severity | default "warning" }}'
        description: '{{ .CommonAnnotations.summary }}'
```

### 3) VS Code extension (matured) + Copilot context

**`extensions/symphony-ops/package.json`**

```json
{
  "name": "symphony-ops",
  "displayName": "Symphony Ops",
  "publisher": "intelgraph",
  "engines": { "vscode": ">=1.85.0" },
  "activationEvents": [
    "onStartupFinished",
    "onCommand:symphony.execute",
    "onCommand:symphony.explain",
    "onView:symphonyModelMatrix"
  ],
  "contributes": {
    "commands": [
      { "command": "symphony.execute", "title": "Symphony: Execute Route" },
      { "command": "symphony.explain", "title": "Symphony: Explain Route" },
      { "command": "symphony.incident", "title": "Symphony: File Incident" }
    ],
    "views": {
      "explorer": [{ "id": "symphonyModelMatrix", "name": "Model Matrix" }]
    }
  },
  "dependencies": { "node-fetch": "^3.3.2" }
}
```

**`extensions/symphony-ops/src/extension.ts`**

```ts
import * as vscode from 'vscode';

export function activate(ctx: vscode.ExtensionContext) {
  const BASE = process.env.SYMPHONY_BASE || 'http://127.0.0.1:8787';

  async function post(path: string, body: any) {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  ctx.subscriptions.push(
    vscode.commands.registerCommand('symphony.execute', async () => {
      const ed = vscode.window.activeTextEditor;
      const input =
        ed?.document.getText(ed.selection) || ed?.document.getText() || '';
      const j = await post('/route/execute', {
        task: 'qa',
        loa: 1,
        input,
        stream: true,
      });
      vscode.window.showInformationMessage(
        `Audit ${j.audit_id} • ${j.latency_ms}ms`,
      );
    }),
    vscode.commands.registerCommand('symphony.explain', async () => {
      const j = await post('/route/plan', { task: 'qa', loa: 1 });
      vscode.window.showInformationMessage(
        `Decision: ${j.decision?.primary?.model || 'n/a'}`,
      );
    }),
  );
}
```

**Copilot context (workspace)** — `.vscode/copilot-context.json`

```json
{
  "contextProviders": [
    {
      "name": "symphonyPolicy",
      "type": "http",
      "url": "http://127.0.0.1:8787/status/health.json"
    },
    {
      "name": "symphonyBurndown",
      "type": "http",
      "url": "http://127.0.0.1:8787/status/burndown.json"
    }
  ],
  "suggest": ["symphonyPolicy", "symphonyBurndown"]
}
```

### 4) Web‑ingest connector (maximize legal web usage)

**`services/web-ingest/src/ingest.ts`**

```ts
import { chromium } from 'playwright';
import robotsParser from 'robots-parser';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';
import * as http from 'node:http';

async function allowedByRobots(targetUrl: string): Promise<boolean> {
  const robotsUrl = new URL('/robots.txt', targetUrl).toString();
  return new Promise<boolean>((resolve) => {
    http
      .get(robotsUrl, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parser = robotsParser(robotsUrl, data);
            resolve(parser.isAllowed(targetUrl, 'IntelGraph-Symphony/1.0'));
          } catch {
            resolve(true); // be permissive if robots.txt is malformed
          }
        });
      })
      .on('error', () => resolve(true));
  });
}

export async function snapshot(url: string) {
  if (!(await allowedByRobots(url))) throw new Error('robots.txt disallows');
  const b = await chromium.launch();
  const p = await b.newPage({
    userAgent: 'IntelGraph-Symphony/1.0 (+contact@example.com)',
  });
  await p.goto(url, { waitUntil: 'networkidle' });
  const html = await p.content();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  await b.close();
  const hash = crypto.createHash('sha256').update(html).digest('hex');
  return {
    url,
    title: article?.title,
    text: article?.textContent,
    html,
    sha256: hash,
    fetchedAt: new Date().toISOString(),
  };
}
```

**Governance knobs** (surface in UI): per‑domain RPS, cache TTL, robots/TOS enforcement, signed HTML snapshot, dedupe by content hash, **allowlist/blocklist**.

### 5) GH↔Jira parity (labels/fields & auto‑tickets)

```yaml
# operator-kit/config/incident.parity.yml
github:
  repo: yourorg/yourrepo
  labels: [incident, slo, symphony]
  fields:
    severity: p1|p2|p3
    component: router|ui|ingest
jira:
  projectKey: SYM
  type: Incident
  mappings: labels <- labels
    summary <- title
    description <- body
    severity <- severity
    component <- component
sync:
  link_backrefs: true
  autoclose_on_recovery: true
```

### 6) Per‑work‑unit tunability (GraphQL surface)

```graphql
# apps/api/schema.graphql
type WorkUnitOverride {
  tokensMax: Int
  contextBudgetTokens: Int
  temperature: Float
  streaming: Boolean
  toolsAllowed: [String!]
  costCeilingUsd: Float
  providerHints: [String!]
}

type PlanRequest {
  id: ID!
  task: String!
  loa: Int!
  overrides: WorkUnitOverride
}
```

### 7) Metrics one‑liners (Prom + Grafana + Alertmanager)

```bash
docker run -d --name prom -p 9090:9090 -v $PWD/prometheus:/etc/prometheus prom/prometheus
docker run -d --name alertmanager -p 9093:9093 -v $PWD/alertmanager:/etc/alertmanager prom/alertmanager
docker run -d --name grafana -p 3000:3000 -v $PWD/grafana:/var/lib/grafana grafana/grafana
```

### 8) DEMO_SCRIPT.md (short)

```md
# Symphony MVP‑2 Demo (10 minutes)

1. `npm run dev` (client) + `cd operator-kit && npm run dev` (API)
2. Open `/console` → **Model Matrix** shows rolling 3h / rolling 5h / daily PT clocks.
3. Runbook → `/route/execute` → **Explain Route** shows denial reasons & quotas.
4. Trigger `just symphony-drill` → observe p95 alert → auto GH+Jira + Slack/PagerDuty.
5. VS Code: select text → **Symphony: Execute Route** → quick result + audit id.
```

---

## Acceptance criteria (MVP‑2)

- **Windows/Quotas live**: Policy supports **rolling (3h/5h)** and **fixed TZ (midnight PT)** windows. Per‑work‑unit overrides (tokens, context, cost, tools, streaming, temperature, LOA, provider hints) are honored and visible.
- **Auto‑tickets on SLO breach** (no human ack): GH issue + Jira incident, cross‑linked, labeled, with run artifacts; Slack/PagerDuty notified.
- **Web connectors (Playwright)**: obey robots.txt/TOS, domain‑level caps, caching; **maximized legal scraping** via Readability + dedupe + signed snapshots.
- **VS Code extension**: runbook commands, **Explain Route**, live **Model Matrix**, `/route/execute` from selection, GH/Jira actions, Copilot context provider injecting audit/policy/runbooks.
- **Explainability**: UI shows applied overrides + quota state; **Model Matrix** displays window clocks with ETAs.
- **Roadmap hooks**: GH Projects ↔ Jira epics sync; SLO debt auto‑enqueued to roadmap nightly.
- **Quality gates**: policy math unit tests; k6 perf (p95 within targets); Lighthouse a11y ≥ 95; security checks (CORS, rate‑limit, PII redaction).

---

## Provider add‑ons & cost control (Grok, Perplexity, DeepSeek, Venice)

- Treat non‑core providers as **external assistants**: prefer APIs; where UI use is permitted, operate within site rules using the web‑ingest **sentinel** mode (for counters/“reset at” only).
- Per‑provider toggles: include/exclude in meta‑search, doc caps per provider, “screenshot answer” for audits, and **header‑driven** window parsing.
- Cost knobs: per‑run `max_cost_usd`, per‑tenant daily/monthly budgets, and per‑provider reserve fractions.

---

## Security & Governance notes

- **No extra deny reasons** beyond license/TOS, tenant privacy, dataset sensitivity (per stakeholder decision).
- Store **credentials** only in managed secret stores; never inside policy files.
- Immutable **audit** for any auto‑burst/fallback, with reason + window ID.
- Two‑person approval for edits that change windows/caps in production.

---

### Ready‑to‑use branch plan

```
feature/mvp2-control-tower-pro
  ├─ PR#1: Policy/Quotas + Alerts
  ├─ PR#2: Providers/Windows + Web‑Ingest
  ├─ PR#3: VS Code + Copilot
  └─ PR#4: GH↔Jira + Roadmap
```

> If you want this split into ready‑to‑merge PRs with file paths matching your repo, apply this structure and wire the endpoints noted above.
