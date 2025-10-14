---
title: "Docs Workstream — Next Sprint Plan (IntelGraph + Maestro)"
summary: "Follow-on sprint to harden docs platform, expand coverage, and add automation & governance dashboards."
owner: "Documentation Expert (Doc IG)"
version: "v0.1"
lastUpdated: "2025-09-30"
sprintWindow: "2025-10-13 → 2025-10-24 (America/Denver)"
status: "Planned — ready to start"
---

# Docs Workstream — Sprint 02 Plan & Export Pack

> **Objective:** Build on Sprint 01 (CI + IA + release pack) to expand reference coverage, automate schema docs, add governance dashboards, and publish role‑based admin/user/operator guides. Ship clean/green, close prioritized gaps.

## 0) Carryover & Dependencies
- **Prereqs from Sprint 01**
  - Docs CI merged and green (front‑matter, link check, Mermaid/PlantUML renderer).
  - `/docs/latest` Diátaxis scaffold in main; Latest alias updated.
  - Release notes + upgrade guide for 2025‑10‑10 published.
- **Dependencies**
  - Access to GraphQL introspection output on CI runners.
  - Read‑only access to observability dashboards (Grafana/Datadog/NewRelic) for screenshots + metrics fields.
  - Product owners sign‑off on SSO setup flows.

## 1) Sprint Goals (what we will ship)
1) **Automated GraphQL/API Reference** generation (build‑time) with diff checks.
2) **Error Catalog v2** with cross‑links to runbooks + incident tags.
3) **Observability Docs**: KPIs, SLOs, alert → action mapping with live examples.
4) **Role‑Based Guides (RBAC)**: Admin, Analyst, Operator quickstarts + task how‑tos.
5) **Authority/License/Provenance Reference** centralized and linked from ingest connectors.
6) **Doc Governance Dashboard** (freshness, coverage, broken links, a11y) published weekly.
7) **Diagram SoT** enforcement: source + SVG pairs, CI render test across repo.

### Acceptance Criteria
- CI step `docs:gql-verify` fails on unreflected schema deltas; published pages updated in the same PR.
- Error codes have unique IDs, machine‑readable YAML source, and md render includes **Fix** + **Observability** columns.
- Each major service has KPIs listed (SLO targets + query/graph references) and an alert→action table.
- Three role‑based landing pages exist under `/docs/latest/get-started/roles/` with at least 3 task flows each.
- All diagrams in touched pages include Mermaid/PlantUML sources with alt text; CI pass.
- Dashboard page `/docs/latest/operations/governance/dashboard.md` renders weekly ingest of metrics JSON.

## 2) Work Breakdown Structure (WBS)

### Week 1 (Oct 13–Oct 17)
- **W1‑A**: Implement `docs:gql-verify` and `gql-to-md` pipeline (see CI below). (Owner: Doc IG, Support: API)
- **W1‑B**: Create machine‑readable **error-codes.yaml** and renderer. (Owner: Doc IG)
- **W1‑C**: Draft Observability docs skeleton; collect KPIs & alert catalogs per service. (Owner: Doc IG, Support: SRE)
- **W1‑D**: Diagram SoT script to ensure `.mmd|.puml` exists for every `.svg`. (Owner: Doc IG)

### Week 2 (Oct 20–Oct 24)
- **W2‑A**: Publish role‑based guides (Admin/Analyst/Operator) with task how‑tos & screenshots/placeholders. (Owner: Doc IG, Support: UX)
- **W2‑B**: Publish **Authority/License/Provenance** reference + link from ingest pages. (Owner: Doc IG, Support: Legal/PM)
- **W2‑C**: Wire **Governance Dashboard** (metrics collector + md renderer) and schedule weekly job. (Owner: Doc IG)
- **W2‑D**: A11y sweep on new pages; link and heading fixes; back‑link blocks added.

## 3) Deliverables (artifacts to merge)
- `/docs/latest/reference/graphql/schema.md` (generated)
- `/docs/latest/reference/api/openapi.md` (if OpenAPI present; otherwise REST refs)
- `/docs/latest/reference/errors/error-codes.yaml` + `index.md` (rendered table)
- `/docs/latest/operations/observability/` (SLOs, alerts→actions, dashboards)
- `/docs/latest/get-started/roles/` (`admin.md`, `analyst.md`, `operator.md`)
- `/docs/latest/reference/authority-provenance.md`
- `/docs/latest/operations/governance/dashboard.md` (with embedded charts)
- `.github/workflows/docs-verify-schema.yml`
- `.github/workflows/docs-governance-report.yml`
- `.ci/scripts/diagram-source-check.mjs`
- `.ci/scripts/errors-render.mjs`

## 4) CI & Automation (ready to copy)

### 4.1 Schema Verification & Docs Generation — `.github/workflows/docs-verify-schema.yml`
```yaml
name: docs-verify-schema
on:
  pull_request:
    paths:
      - "schema/**"
      - "api/**"
      - "docs/**"
      - "scripts/**"

jobs:
  gql:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install tooling
        run: |
          npm i -g graphql graphql-inspector@4.x
      - name: Generate schema docs
        run: |
          node scripts/gql-to-md.mjs build/graphql-schema.json > docs/latest/reference/graphql/schema.md
      - name: Verify schema docs up to date
        run: |
          git diff --exit-code docs/latest/reference/graphql/schema.md || (echo "GraphQL docs out of date" && exit 1)
```

### 4.2 Errors Table Render — `.ci/scripts/errors-render.mjs`
```js
import fs from 'node:fs';
import yaml from 'js-yaml';
const y = yaml.load(fs.readFileSync('docs/latest/reference/errors/error-codes.yaml','utf8'));
const rows = y.errors.map(e=>`| ${e.code} | ${e.layer} | ${e.message} | ${e.cause} | ${e.fix} | ${e.observability} |`).join('\n');
const md = `# Error Catalog\n\n| Code | Layer | Message | Cause | Fix | Observability |\n|---|---|---|---|---|---|\n${rows}\n`;
fs.writeFileSync('docs/latest/reference/errors/index.md', md);
```

### 4.3 Diagram Source Check — `.ci/scripts/diagram-source-check.mjs`
```js
import fs from 'node:fs';
import globby from 'globby';
const svgs = await globby(['docs/**/*.svg']);
let fail = false;
for (const svg of svgs) {
  const base = svg.replace(/\.svg$/, '');
  const hasSrc = fs.existsSync(base + '.mmd') || fs.existsSync(base + '.puml');
  if (!hasSrc) { console.log(`❌ Missing source for ${svg}`); fail = true; }
}
if (fail) process.exit(1);
```

### 4.4 Governance Report — `.github/workflows/docs-governance-report.yml`
```yaml
name: docs-governance-report
on:
  schedule:
    - cron: '0 14 * * 1' # Mondays 08:00 America/Denver
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Collect metrics
        run: node .ci/scripts/docs-metrics.mjs > docs/latest/operations/governance/metrics.json
      - name: Render dashboard
        run: node .ci/scripts/docs-dashboard-render.mjs docs/latest/operations/governance/metrics.json > docs/latest/operations/governance/dashboard.md
      - name: Commit report
        run: |
          git config user.name "docs-bot"; git config user.email "docs-bot@example.com";
          git add docs/latest/operations/governance/* && git commit -m "docs: weekly governance report" || true
          git push || true
```

### 4.5 Metrics Collector — `.ci/scripts/docs-metrics.mjs`
```js
import fs from 'node:fs';
import globby from 'globby';
import matter from 'gray-matter';
const files = await globby(['docs/**/*.md']);
let broken = 0; // optionally run linkinator here
let missingFM = 0; let alt = 0; let totalImgs = 0;
for (const f of files) {
  const s = fs.readFileSync(f,'utf8');
  const fm = matter(s).data || {};
  if (!fm.title || !fm.lastUpdated || !fm.owner) missingFM++;
  const imgs = [...s.matchAll(/!\[[^\]]*\]\([^\)]+\)/g)];
  totalImgs += imgs.length;
  alt += imgs.filter(m=>/^!\[[^\]]+\]/.test(m[0])).length;
}
const coverage = { howtos: (await globby(['docs/**/how-tos/**/*.md'])).length };
console.log(JSON.stringify({ timestamp: new Date().toISOString(), missingFrontMatter: missingFM, imagesWithAlt: alt, imagesTotal: totalImgs, coverage }));
```

### 4.6 Dashboard Renderer — `.ci/scripts/docs-dashboard-render.mjs`
```js
import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const pctAlt = m.imagesTotal ? Math.round(100*m.imagesWithAlt/m.imagesTotal) : 100;
console.log(`# Docs Governance Dashboard\n\n- Generated: ${m.timestamp}\n- Pages missing front-matter: **${m.missingFrontMatter}**\n- Images with alt text: **${pctAlt}%** (${m.imagesWithAlt}/${m.imagesTotal})\n- How-tos coverage: **${m.coverage.howtos}** pages\n`);
```

## 5) Page Stubs & Scaffolds (ready to copy)

### 5.1 Role-Based Guides
`docs/latest/get-started/roles/admin.md`
```markdown
---
title: "Admin Guide"
summary: "Provision orgs, SSO, spaces, and policies."
owner: "Product — Admin"
version: "1.0"
lastUpdated: "2025-10-13"
---

## Quickstart
1. Connect IdP (Okta/Entra/Google).
2. Create spaces and assign roles.
3. Set data retention and export controls.

## Tasks
- Configure SSO → How‑to link
- Define RBAC policies → Reference link
- Set quotas & retention → How‑to link
```

`docs/latest/get-started/roles/analyst.md`
```markdown
---
title: "Analyst Guide"
summary: "Run investigations, collaborate, and export."
owner: "Product — Analyst"
version: "1.0"
lastUpdated: "2025-10-13"
---

## Quickstart
1. Create a project and import sources.
2. Build an investigation graph.
3. Share findings and export.
```

`docs/latest/get-started/roles/operator.md`
```markdown
---
title: "Operator Guide"
summary: "Operate and observe the platform."
owner: "Platform Ops"
version: "1.0"
lastUpdated: "2025-10-13"
---

## Quickstart
1. Deploy/upgrade via Maestro.
2. Monitor KPIs & alerts.
3. Run playbooks during incidents.
```

### 5.2 Observability (skeleton)
`docs/latest/operations/observability/index.md`
```markdown
---
title: "Observability Overview"
summary: "KPIs, SLOs, alert routing, and dashboards."
owner: "SRE"
version: "1.0"
lastUpdated: "2025-10-13"
---

## KPIs & SLOs
- API: p95 latency ≤ 300ms; 99.9% availability
- Ingest: success rate ≥ 99%; time‑to‑freshness ≤ 5m

## Alerts → Actions
| Alert | Threshold | Action | Runbook |
|---|---|---|---|
| API 5xx | >1% 5m | Roll to last green; check DB | link |
```

### 5.3 Authority/License/Provenance Reference
`docs/latest/reference/authority-provenance.md`
```markdown
---
title: "Authority, License & Provenance"
summary: "Source licensing, permissible use, and export controls."
owner: "Legal/PM"
version: "1.0"
lastUpdated: "2025-10-13"
---

## Source Types
- Open data (permissive)
- Commercial (contract)
- Sensitive (restricted)

## Enforcement
- Import checks; export banners; audit trail links.
```

### 5.4 Error Codes Source (YAML)
`docs/latest/reference/errors/error-codes.yaml`
```yaml
errors:
  - code: IG-API-001
    layer: GraphQL
    message: Unauthorized
    cause: Missing/expired token
    fix: Refresh token / login
    observability: http.401.rate
  - code: IG-API-002
    layer: GraphQL
    message: Forbidden
    cause: RBAC policy denies
    fix: Request access / adjust policy
    observability: http.403.rate
  - code: IG-ING-010
    layer: Ingest
    message: Source fetch failed
    cause: Network/credential
    fix: Retry with backoff; rotate secret
    observability: ingest.failure_rate
```

## 6) Risks & Mitigations
- **Access lag to metrics dashboards** → Stub screenshots + note synthetic data; replace before release.
- **Schema churn during sprint** → Run docs generation in PRs modifying schema; adopt `docs-required` + `docs-verify-schema` combo.
- **Legal clarifications on licensing** → Prepare placeholders with TODO banners; track via issue links.

## 7) Communication & Rituals
- **Daily**: 10‑min standup, blockers on CI or content access.
- **Weekly**: Governance dashboard auto‑posts; review deltas.
- **Freeze**: 24h before 2025‑10‑24; finalize notes and cross‑links.

## 8) Definition of Done (Sprint 02)
- All goals above merged to `main`, CI green.
- Docs site builds with zero warnings; link & a11y checks pass.
- Role guides and observability pages discoverable in ≤3 clicks from top nav.
- Governance dashboard shows ≥95% images with alt text and 0 pages missing mandatory front‑matter in touched scope.

---

### Ready to Execute
This plan is aligned with current trains and can start Oct 13, 2025. The repo will exit the sprint with automated schema docs, beefed‑up references, stronger governance, and role‑based guides—closing the highest‑value gaps from Sprint 01.

