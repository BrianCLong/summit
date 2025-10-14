# Revenue & Release Booster Pack — CLI Release, Grafana Datasources, GTM, Billing, KPIs

This pack does the two asks **and** layers on growth/enterprise levers to make IntelGraph fundable and revenue‑positive: CLI publishing + README badge/snippet, Grafana **datasource provisioning** for zero‑touch dashboards, billing (Stripe) hooks, pricing, product analytics, sales enablement, security posture (SOC2), SLAs, and KPI/OKR scaffolding.

---

## 1) Publish `intelgraphctl` as a GitHub Release artifact + README badge

### 1.1 Release workflow (build, attach artifact)
```yaml
# .github/workflows/cli-release.yaml (replace/extend)
name: cli-release
on:
  workflow_dispatch:
    inputs:
      version: { description: 'CLI semver (e.g., 1.0.0)', required: true, type: string }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd cli/intelgraphctl && npm ci && npm run build && npm pack
      - name: Create Release
        id: rel
        uses: softprops/action-gh-release@v2
        with:
          tag_name: cli-v${{ inputs.version }}
          name: intelgraphctl ${{ inputs.version }}
          body: |
            One-command installer. See /docs/install/cli.md
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - name: Upload artifact
        uses: softprops/action-gh-release@v2
        with:
          files: cli/intelgraphctl/*.tgz
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

### 1.2 README badge & install snippet
```md
<!-- README.md additions -->
[![intelgraphctl](https://img.shields.io/badge/cli-download-blue)](../../releases/latest)

### Quick Install (CLI)
```bash
# Download latest CLI artifact
echo "Downloading intelgraphctl…" && \
  URL=$(curl -s https://api.github.com/repos/BrianCLong/intelgraph/releases/latest | \
       jq -r '.assets[]|select(.name|test("intelgraphctl.*.tgz")).browser_download_url') && \
  curl -L "$URL" -o intelgraphctl.tgz && tar -xzf intelgraphctl.tgz && \
  node cli/intelgraphctl/dist/index.js preflight --issuer https://keycloak.example.com/auth/realms/intelgraph --host gateway.example.com && \
  node cli/intelgraphctl/dist/index.js install --org BrianCLong/intelgraph --chart intelgraph --version 1.0.0 && \
  TENANT=pilot node bootstrap/seed-tenant.ts
```
```

---

## 2) Grafana Datasource Provisioning (Prometheus/Jaeger) — Zero‑touch

### 2.1 Datasource JSONs
```json
// ops/grafana/datasources/prometheus.json
{ "name": "Prometheus", "type": "prometheus", "access": "proxy", "url": "http://prometheus.observability:9090", "jsonData": { "httpMethod": "POST" } }
```

```json
// ops/grafana/datasources/jaeger.json
{ "name": "Jaeger", "type": "jaeger", "access": "proxy", "url": "http://jaeger-query.observability:16686" }
```

### 2.2 Enhanced import script
```bash
# ops/grafana/import-dashboards.sh (append at top)
create_ds(){
  file=$1
  echo "Provisioning datasource $(basename "$file")"
  curl -fsS "$API/datasources" "${HDR[@]}" -d @"$file" >/dev/null || true
}
# create/ensure datasources
for d in ops/grafana/datasources/*.json; do create_ds "$d"; done
```

---

## 3) Billing & Pricing — Stripe hooks, plans, and metering

### 3.1 Pricing tiers (value‑aligned)
```md
# docs/pricing.md
- **Starter** ($1,250/mo): 10 seats, 2M nodes/edges, 2 cases, PageRank/Louvain, community support.
- **Team** ($4,900/mo): 40 seats, 10M nodes/edges, 10 cases, Pattern Miner, DSAR/Retention, email support.
- **Enterprise** (contact): SSO/SCIM, Wallets/Federation, custom SLAs, on‑prem, dedicated support, private models.
- **Overages**: Cost Guard deters runaway; metering billed @ $0.40 per million edges scanned over plan.
```

### 3.2 Stripe webhook & metering skeleton
```ts
// services/billing/src/index.ts
import express from 'express'; import Stripe from 'stripe';
const app = express(); app.use(express.json({ type: 'application/json' }));
const stripe = new Stripe(process.env.STRIPE_KEY as string, { apiVersion: '2024-06-20' });
app.post('/webhook', express.raw({ type: 'application/json' }) as any, (req,res)=>{ /* verify signature, upsert subscription */ res.sendStatus(200); });
app.post('/meter', async (req,res)=>{ /* record usage for tenant */ res.json({ ok:true }); });
app.listen(process.env.PORT||7080);
```

### 3.3 Gateway metering emit (CPI & edges scanned)
```ts
// services/gateway-graphql/src/meter.ts
export function emitUsage(tenant:string, edges:number, ms:number){
  fetch(process.env.BILLING_URL+'/meter',{ method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tenant, edges, ms, ts: Date.now() }) }).catch(()=>{});
}
```

Hook from analytics execution path.

---

## 4) Product Analytics & Growth Loops

### 4.1 Events
```ts
// webapp/src/analytics/events.ts
export function track(ev:string, props:Record<string,any>={}){
  try{ navigator.sendBeacon('/analytics', new Blob([JSON.stringify({ ev, props, ts:Date.now() })],{type:'application/json'})); }catch{}
}
```

Emit on: login, NL→Cypher preview/run, Analytics run, Case created, Report rendered, Wallet issued, Policy denial (simulator), DSAR generated.

### 4.2 Growth hooks
- **Shareable Wallets** (press profile) with issuer branding.
- **Invite‑a‑teammate** modal on first report render.
- **Trial upgrade** banner when hitting budget limits.

---

## 5) Enterprise Trust — SOC 2, SLAs, DPA

- **SOC 2 Readiness**: `/compliance/soc2-checklist.md` (controls mapped to implemented features).
- **SLA Templates**: `/docs/legal/SLA.md` — `99.9%` gateway, `99.5%` analytics; credits table.
- **DPA**: `/docs/legal/DPA.md` with sub‑processors list.

---

## 6) Sales Enablement & ROI

- **Pitch Deck**: `/sales/pitch/outline.md` — Problem, Why Now, IntelGraph Advantage (provenance, wallets), Live Demo script, Pricing.
- **ROI Calculator**: `/sales/roi/roi.xlsx` — Inputs: analysts/hr, cases/mo, avg edges/case, tool cost; Outputs: CPI delta, payback.
- **Battlecards**: `/sales/battlecards/{palantir,maltego,rf,graphika}.md`.

---

## 7) KPIs, OKRs, and Board‑ready Reporting

```yaml
# ops/kpi/kpis.yaml
north_star: cost_per_insight
activation: first_report_time_min
engagement: weekly_active_analysts
expansion: seats_per_tenant, add_on_attach_rate
reliability: p95_graph_ms, budget_denies_rate
security: time_to_revoke_wallet, dsar_tta
```

Quarterly **OKRs** in `/ops/okr/2025Q4.yaml` with key results tied to KPIs.

---

## 8) README landing updates (buyers + developers)
```md
## Why IntelGraph (3 bullets)
- **Provable provenance & disclosure wallets**: trust every insight.
- **LLM‑augmented analysis**: NL→Cypher, pattern miner, and Graph‑XAI.
- **Enterprise‑ready**: OIDC/OPA, DSAR/retention, signed Helm charts, DR drills.

## Install in Minutes
- Use our **CLI** or **Helm** (signed, OCI) with verified SBOMs.

## Pricing & Contact
See [pricing](docs/pricing.md). Enterprise? Email sales@intelgraph.dev
```

---

## 9) Make & CI Additions
```make
release-cli:
	gh workflow run cli-release.yaml -f version=$(VER)

grafana-zero:
	GRAFANA_URL=$(GRAFANA_URL) GRAFANA_TOKEN=$(GRAFANA_TOKEN) bash ops/grafana/import-dashboards.sh

seed-tenant:
	TENANT=$(TENANT) node bootstrap/seed-tenant.ts
```

```yaml
# .github/workflows/metrics-rollup.yaml
name: metrics-rollup
on: { schedule: [{ cron: '0 7 * * *' }] }
jobs:
  rollup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/metrics/rollup.js  # aggregates CPI, activation
```

---

## 10) Decacorn Flight Path (Q1 2032)
- **2025–2026**: Nail ICP (financial crime, trust & safety). Land 20 enterprise logos. Target $3–5M ARR.
- **2027–2029**: Platformize: app marketplace (patterns/runbooks), partner SI program, managed cloud. $100M ARR run‑rate.
- **2030–2032**: Network effects via **wallet disclosures** across orgs/federations; privacy‑preserving analytics (ZK). Expand to regulated sectors worldwide. IPO‑ready metrics: >90% gross retention, >120% net expansion.

---

## 11) Fundability Checklist
- [x] Signed artifacts (charts), SBOMs, DR drills, SLOs
- [x] Revenue levers (pricing, metering, growth hooks)
- [x] Enterprise readiness (OIDC/OPA, DSAR/Retention, DPA/SLA)
- [x] Sales enablement & ROI proof
- [x] KPI/OKR discipline & reporting
```

