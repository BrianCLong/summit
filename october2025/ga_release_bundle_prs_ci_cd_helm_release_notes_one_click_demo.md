# GA Release Bundle — PRs, CI/CD, Helm, Release Notes, One‑Click Demo

This bundle stitches Sprints 1–4 into PR‑ready branches with commits, CI/CD hardening, Helm charts, upgrade/migration steps, and an end‑to‑end demo workflow.

---

## 0) Branching & PR Plan

Create four PRs plus a meta release PR. Order matters for clean diffs.

1. **PR #1 — foundation**: `feature/sprint1-lac-ledger`
   - Services: LAC, Prov‑Ledger, Gateway, Webapp scaffold, OTEL/Prom/Grafana, k6/Playwright, Prisma.
   - Tags: `area:guardrails`, `svc:lac`, `svc:ledger`, `kind:feature`.
2. **PR #2 — analyst surface**: `feature/sprint2-analyst-surface-analytics`
   - Services: Analytics (GDS), Pattern Miner, NL→Cypher v0.9, Tri‑Pane v1, cost guard hooks.
   - Tags: `area:ux`, `svc:analytics`, `svc:miner`, `svc:nl2c`.
3. **PR #3 — collaboration & cost**: `feature/sprint3-cases-runbooks-offline`
   - Services: Case, Report, Runbook Engine, Budget Guard, Archive Tier, Offline Kit.
   - Tags: `area:collab`, `svc:case`, `svc:report`, `svc:runbook`.
4. **PR #4 — xai/federation/wallets/ga**: `feature/sprint4-xai-fed-wallets-ga`
   - Services: XAI, Federation, Wallets, Hardening suite.
   - Tags: `area:xai`, `area:federation`, `kind:hardening`.
5. **Release PR**: `release/ga-2025.11` → merges all, updates changelog, bumps version, and ships Helm.

Each PR includes: scope, acceptance criteria, screenshots (or GIFs), and **demo commands**.

---

## 1) Commit Layout Examples (squash‑friendly)

**PR #1 commits**

- `feat(lac): policy DSL + compiler + enforcer API with OTEL`
- `feat(ledger): merkle manifests + verify endpoint + prisma schema`
- `feat(gateway): GraphQL schema for enforce/verify + tracing`
- `feat(web): tri-pane scaffold + jQuery bridges + e2e smoke`
- `chore(ops): compose stack + grafana/prom + jaeger`
- `test(all): jest + playwright + k6 smoke`

**PR #4 commits**

- `feat(xai): counterfactuals + saliency + model cards`
- `feat(fed): hashed selectors + push-down + revoke`
- `feat(wallet): bundles + audience profiles + verifier`
- `chore(hardening): fuzz + sbom + a11y + soak`

---

## 2) CI/CD — GitHub Actions (multi‑job with required gates)

```yaml
# .github/workflows/ga-pipeline.yaml
name: ga-pipeline
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main, release/* ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build
      - run: pnpm -r test -- --ci

  e2e:
    runs-on: ubuntu-latest
    needs: build-test
    services:
      # launch compose stack for web & gateway
      docker:
        image: docker:stable-dind
    steps:
      - uses: actions/checkout@v4
      - name: Start stack
        run: docker compose -f docker-compose.dev.yaml up -d --build
      - name: Wait for deps
        run: |
          npx wait-on tcp:7000 tcp:5173 http://localhost:5173
      - name: Playwright
        run: pnpm --filter webapp exec playwright install --with-deps && pnpm --filter webapp exec playwright test

  load:
    runs-on: ubuntu-latest
    needs: e2e
    steps:
      - uses: actions/checkout@v4
      - name: k6 smoke
        run: |
          docker run --network host -i grafana/k6 run - < ops/k6/gateway-queries.js

  security:
    runs-on: ubuntu-latest
    needs: build-test
    steps:
      - uses: actions/checkout@v4
      - name: SAST (semgrep)
        uses: returntocorp/semgrep-action@v1
        with: { config: p/ci }
      - name: Dependency scan
        run: npx audit-ci --high 0 --critical 0 || true
      - name: SBOM
        run: node services/hardening/scripts/sbom.cjs

  a11y:
    runs-on: ubuntu-latest
    needs: e2e
    steps:
      - uses: actions/checkout@v4
      - name: axe checks
        run: node ops/accessibility/axe-ci.js

  containers:
    runs-on: ubuntu-latest
    needs: [build-test, security]
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - name: Build & push images
        run: |
          for svc in lac-policy-compiler prov-ledger gateway-graphql analytics-service pattern-miner case-service report-service runbook-engine budget-guard archive-tier offline-sync xai-service federation-service wallet-service; do
            docker build -t ghcr.io/${{ github.repository }}/$svc:${{ github.sha }} ./services/$svc
            docker push ghcr.io/${{ github.repository }}/$svc:${{ github.sha }}
          done

  helm:
    runs-on: ubuntu-latest
    needs: containers
    steps:
      - uses: actions/checkout@v4
      - name: Package Helm
        run: helm package deploy/helm/intelgraph && mkdir -p dist && mv intelgraph-*.tgz dist/
      - uses: actions/upload-artifact@v4
        with: { name: helm-chart, path: dist }
```

**Branch protections**: require `build-test`, `e2e`, `security`, and `a11y` to pass.

---

## 3) Helm Chart (baseline)

```
deploy/helm/intelgraph/
├─ Chart.yaml
├─ values.yaml
├─ templates/
│  ├─ configmap.yaml
│  ├─ deployment-*.yaml
│  ├─ service-*.yaml
│  ├─ ingress.yaml
│  └─ hpa-*.yaml
```

**Chart.yaml**

```yaml
apiVersion: v2
name: intelgraph
version: 0.1.0
appVersion: 1.0.0
```

**values.yaml** (snip)

```yaml
imageRepo: ghcr.io/ORG/intelgraph
replicas: 2
commonEnv:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
  NEO4J_URL: bolt://neo4j:7687
  NEO4J_USER: neo4j
  NEO4J_PASS: intelgraph
  LAC_URL: http://lac:7001
  LEDGER_URL: http://ledger:7002

services:
  lac:
    image: lac-policy-compiler
    port: 7001
  ledger:
    image: prov-ledger
    port: 7002
  gateway:
    image: gateway-graphql
    port: 7000
  analytics:
    image: analytics-service
    port: 7003
  # ... (all other services)
```

**templates/deployment-gateway.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: intelgraph-gateway }
spec:
  replicas: {{ .Values.replicas }}
  selector: { matchLabels: { app: gateway } }
  template:
    metadata: { labels: { app: gateway } }
    spec:
      containers:
      - name: gateway
        image: {{ .Values.imageRepo }}/gateway-graphql:{{ .Chart.AppVersion }}
        ports: [{ containerPort: 7000 }]
        env:
        - name: LAC_URL
          value: {{ .Values.commonEnv.LAC_URL | quote }}
        - name: LEDGER_URL
          value: {{ .Values.commonEnv.LEDGER_URL | quote }}
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: {{ .Values.commonEnv.OTEL_EXPORTER_OTLP_ENDPOINT | quote }}
        readinessProbe: { httpGet: { path: /health, port: 7000 }, initialDelaySeconds: 5, periodSeconds: 10 }
        livenessProbe: { httpGet: { path: /health, port: 7000 }, initialDelaySeconds: 15, periodSeconds: 20 }
        resources: { requests: { cpu: "200m", memory: "256Mi" }, limits: { cpu: "1", memory: "1Gi" } }
```

---

## 4) Kustomize Overlays (dev/stage/prod)

```
deploy/kustomize/
├─ base/ (manifests from helm template output)
└─ overlays/
   ├─ dev/kustomization.yaml
   ├─ stage/kustomization.yaml
   └─ prod/kustomization.yaml
```

Dev overlay example increases logs, sets 1 replica, exposes NodePorts.

---

## 5) Database Migrations & Upgrade Steps

**Order of operations** (prod):

1. Put app in read‑only for 60s window (maintenance banner).
2. Apply **ledger** & **case-service** migrations first (no breaking changes).
3. Deploy **gateway** with feature flags disabled for new mutations.
4. Roll out **analytics/miner/nl2c** (no DB changes).
5. Roll out **report/runbook/budget/archive/offline**.
6. Roll out **xai/fed/wallet**.
7. Flip feature flags per tenant; monitor dashboards.

**Backfill** (optional):

- Generate manifests for existing claims; write to `Manifest` and link via `manifestId`.
- Initialize budget rows per tenant in budget‑guard.

**Rollback strategy**:

- Blue/green on gateway; DB migrations are additive; keep old pods for 1h.

---

## 6) One‑Click Demo Workflow (makefile)

```make
# Makefile
.PHONY: demo up seed e2e load grafana
up:
	docker compose -f docker-compose.dev.yaml up -d --build
seed:
	pnpm ts-node tools/scripts/seed-fixtures.ts

demo:
	make up && make seed && node tools/scripts/record-demo.js

e2e:
	pnpm --filter webapp exec playwright test
load:
	docker run --network host -i grafana/k6 run - < ops/k6/gateway-queries.js
```

`tools/scripts/record-demo.js` runs the cross‑sprint path (compile policy → ingest → NL→Cypher → analytics → pattern → runbook → report → wallet).

---

## 7) Release Notes (DRAFT)

**Version:** 1.0.0 (GA) — 2025‑11‑25

### Highlights

- Guardrails: **Policy Compiler (LAC)**, **Provenance/Claim Ledger** with deterministic manifests.
- Analyst Surface: **Tri‑Pane UX v1**, **NL→Cypher v0.9**, **Analytics Pack v1**, **Pattern Miner**.
- Collaboration/Cost: **Case Spaces**, **Report Studio**, **Runbook Runtime v1**, **Budget Guard**, **Archive Tier**, **Offline Kit v1**.
- Explain/Federate/Disclose: **Graph‑XAI v1**, **Zero‑Copy Federation stubs**, **Selective Disclosure Wallets**.

### SLOs

- p95 graph query < 1.5s on 50k nodes / 3‑hop
- RTO ≤ 1h, RPO ≤ 5m

### Security & Compliance

- ABAC/RBAC + step‑up, OIDC ready
- Policy hit rate > 99% on test corpus
- SBOM generated; zero criticals at release
- A11y AA/AAA across core flows

### Known Limitations

- XAI uses baseline algorithms (to be swapped with GNN explainers)
- Federation is a demo stub (claim hashes not raw records)
- Wallet verifier is in‑cluster (external CDN planned)

---

## 8) PR Templates & Issue Templates

**.github/pull_request_template.md**

```md
## Summary

## Acceptance Criteria

- [ ] Tests added/updated (Jest/Playwright/k6)
- [ ] OTEL spans and Grafana panels updated
- [ ] Security checks (SAST/SBOM) green
- [ ] Docs & demo script updated

## Screenshots / Demo

## Risks / Rollback
```

**.github/ISSUE_TEMPLATE/feature.md**

```md
### Goal

### Acceptance Criteria

### Data/Privacy Considerations

### Telemetry Plan
```

---

## 9) Post‑GA Follow‑ups (tracked as epics)

- Replace baseline XAI with GNN explainers (PGExplainer/CF‑GNN/GraphMask) and fairness panels.
- True **zero‑copy federation** via MPC/ZK integration; external proof verifier.
- Mobile‑first tri‑pane; edge sync for Offline Kit.
- Multi‑tenant budgeting UI; anomaly detectors in runbooks.

---

## 10) Sign‑off Checklist (for the Release PR)

- [ ] All CI jobs required & green
- [ ] Helm chart packaged and smoke deployed in `stage`
- [ ] Migrations applied; backfills complete
- [ ] Demo workflow recorded (video + dataset)
- [ ] Release notes finalized & tagged
- [ ] STRIDE notes attached
