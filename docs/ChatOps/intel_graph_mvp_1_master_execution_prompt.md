# 🔱 IntelGraph MVP‑1+ — Master Execution Prompt

> Paste this prompt verbatim into your team chat / GitHub Project / kickoff doc. It aligns everyone on scope, tempo, quality gates, merge discipline, and release hygiene so we converge on **MVP‑1+** quickly and cleanly.

---

## 🎯 Mission

Deliver **MVP‑1+** as a single, cleanly merged, production‑ready release that:

- Preserves all MVP‑0 wins (perf, auth, ingest, realtime, import/export) ✅
- Adds enterprise readiness (RBAC depth, audit, export to PDF, analytics panel, copilot service, observability, security hardening) 🔒📊🤖
- Ships with **zero‑downtime deploy**, repeatable rollbacks, and crisp documentation.

**Target window:** 4 weeks from kickoff.

---

## ✅ Definition of Done (DoD) — MVP‑1+

1. **Code & Merge**
   - All feature branches merged via protected PRs into `main` using **squash** (linear history).
   - No `TODO/FIXME` left in code; all tracked as issues.
   - License headers and NOTICE updated (MIT).
2. **Security & AuthZ**
   - Fine‑grained RBAC enforced in GraphQL resolvers (investigation/node/edge level).
   - Audit trail recorded for all mutations (immutable append store in Postgres; mirror event to Neo4j optional).
   - JWT RS256 rotation verified; Redis denylist enforced; tenant isolation tests green.
3. **Analytics & Copilot**
   - Analytics panel: PageRank, Community Detection, Shortest Path, Anomaly score (via Cypher/Neo4j GDS or server module).
   - Copilot service wraps NER + link suggestions; exposed via GraphQL proxy; feature‑flagged.
4. **Export & Reporting**
   - Export: JSON, CSV, **PDF** (Puppeteer or PDFKit) with metadata header & audit footer.
5. **Observability**
   - OpenTelemetry traces for API, Graph ops, Copilot; Prometheus metrics; Grafana dashboard URLs recorded in README.
6. **Performance** (on 150k nodes / 600k edges)
   - GraphQL p95 < **350ms**; Socket.IO event end‑to‑end < **600ms**; ingest steady at **2k edges/s** burst 60s.
   - Import 100k CSV rows < **3m** with backpressure and retry.
7. **Quality Gates**
   - Unit coverage ≥ **80%**; E2E (Playwright) green for core flows; K6 baseline shows <2% error rate @ target RPS.
8. **Release**
   - Tagged `v1.0.0-rc1..N` → `v1.0.0`. Signed containers. Rollback plan tested. Release notes published.

---

## 🧭 Scope (What’s In)

- **RBAC++ & Audit** in GraphQL + UI conditional rendering.
- **Copilot** FastAPI (or Node) microservice: NER (90% precision target), relation suggestions, explain‑ability traces.
- **Analytics panel**: results table + Cytoscape overlay + CSV export.
- **Export to PDF** with page template and watermark.
- **OpenTelemetry + Prometheus + Grafana** (dashboards committed as JSON).
- **Security hardening**: ZAP baseline, dependency audit, HTTPS‑only, secret rotation.

**Out** (defer): mobile app, multi‑cloud federated ingestion, advanced GNN.

---

## 🧩 Architecture Guardrails

- Keep monorepo structure; services communicate via GraphQL/HTTP; WebSockets for realtime.
- Feature flags for: `copilot`, `analytics`, `pdfExport`, `gdsAlgorithms`.
- Tenant ID required on all write paths; enforced at resolver boundary.

---

## 🔀 Branching & Merge Discipline

- Base branch: `main` (protected). Integration branch: `release/mvp1+`.
- Feature branches: `feature/<area>-<short-desc>` (e.g., `feature/rbac-audit`).
- **Squash‑merge only** to keep history clean. Delete branches post‑merge.
- Lockfiles (`package-lock.json`, `poetry.lock`) use `ours` merge strategy via `.gitattributes` to avoid churn.
- Require: status checks (lint, unit, e2e, build, container, k6‑smoke), code owner approval, signed commits.

---

## 🧪 CI/CD Quality Gates (GitHub Actions)

**Required jobs** before merge:

1. `lint` → ESLint/Prettier, Markdownlint, GraphQL schema check.
2. `test-unit` → Jest (Node) / Pytest (AI). Coverage gate ≥ 80%.
3. `test-e2e` → Playwright headless core flows.
4. `build` → Node + UI build; Python wheel (if any).
5. `container` → Docker build + Trivy scan (CRITICAL=0, HIGH≤3).
6. `k6-smoke` → 2‑min smoke (auth, query, mutation, socket event).
7. `zap-baseline` → Fail on medium+.

**On tag `v*`**

- Push images → registry; generate SBOM (Syft) + attestations; create GitHub Release.

---

## 🧰 PR Template (copy into `.github/pull_request_template.md`)

```markdown
## Summary

- What & why

## Scope

- [ ] Feature flag behind `<flag>`
- [ ] User‑visible change documented

## Testing

- [ ] Unit tests added/updated
- [ ] Playwright scenario(s)
- [ ] K6 check updated if path hot

## Security

- [ ] Inputs validated & sanitized
- [ ] AuthZ covered (RBAC)
- [ ] Secrets via env/manager only

## Performance

- [ ] Adds no N+1; DataLoader coverage
- [ ] p95 budget impact assessed

## Screenshots / Evidence

## Checklist

- [ ] Lint passes
- [ ] CI green
- [ ] Code owner review
```

---

## 🧱 Zero‑Downtime Migration Pattern

1. **Phase A (Additive)**: Add new columns/labels/indexes; code reads both old+new.
2. **Phase B (Dual‑write)**: App writes to both shapes; backfill historical.
3. **Phase C (Cutover)**: Flip reads to new; feature flag guard.
4. **Phase D (Cleanup)**: Remove old fields/edges after 2 releases.

Rollback = flip feature flag + revert traffic; data safe due to dual‑write.

---

## 📈 Performance Budgets & Tests

- GraphQL resolver p95 < 350ms; resolver depth cap; DataLoader required.
- Socket.IO E2E < 600ms; room fan‑out validated @ 200 concurrent clients.
- Import: stream CSV/JSON; UNWIND batches (1–5k); retry w/ backoff.
- Cache: Redis TTL 60–120s; cache stampede guard.
- K6 scripts in `tests/k6`: auth, graph query, mutation, socket broadcast.

---

## 👁️‍🗨️ Observability SLOs (commit dashboards)

- API latency p95, error rate, throughput.
- Neo4j: query time p95, active transactions, page cache hit ratio.
- Copilot: queue depth, infer latency, timeouts.
- Frontend: Web‑Vitals (FID/INP, LCP); source maps uploaded.

---

## 🛡️ Security Hardening Must‑Dos

- OWASP ZAP baseline → 0 high; CSP & HSTS headers; cookies secure.
- Dependency audit: `npm audit`, `pip-audit`; Renovate for auto PRs.
- Secrets: no plaintext in repo; `.env.example` only; CI uses OIDC/KeyVault.
- Multi‑tenant isolation tests (positive + negative) in E2E.

---

## 🧪 Test Matrix (minimum)

| Area          | Tests                                                            |
| ------------- | ---------------------------------------------------------------- |
| Auth          | happy path, refresh rotation, denylist, tenant isolation         |
| Graph         | CRUD, search, neighbors, pagination, FTS                         |
| Realtime      | join/leave rooms, delta replay, backpressure                     |
| Import/Export | 100k CSV stream, resume on error, PDF checksum                   |
| RBAC          | role table, edge cases (cross‑tenant, privilege escalation)      |
| Copilot       | NER precision eval set, suggestion precision@k, timeout fallback |
| Analytics     | PageRank/Community deterministic snapshots                       |

---

## 🚀 Release Train

- Weekly cut to `release/mvp1+`.
- Tag `v1.0.0-rcN` after green CI + staging sign‑off.
- Canary 10% for 24h; watch SLOs; promote to 100% or auto‑rollback.

---

## 🗂️ Workstream Owners

- **Backend**: RBAC/Audit, Export, Subscriptions
- **Frontend**: Analytics panel, Export UI, Copilot UI, perf overlay
- **AI/ML**: Copilot svc, NER evals, suggestion models
- **DevOps**: CI gates, OTel/Prom/Grafana, ZAP, canary & rollback
- **Data/Graph**: Neo4j indices, Cypher tuning, GDS jobs

---

## 📜 Daily Ritual (15 min)

1. Triage red CI; unblock merges.
2. Review `perf & error` dashboards; create issues for regressions.
3. Inspect open PRs >24h; assign owners; enforce template.
4. End‑of‑day: update release board; attach evidence links.

---

## 📌 Kickoff Checklist (run now)

- [ ] Protect `main`; create `release/mvp1+`.
- [ ] Enable required checks (see CI list) + signed commits + linear history.
- [ ] Add PR template and CODEOWNERS.
- [ ] Add feature flags (`copilot`, `analytics`, `pdfExport`, `gdsAlgorithms`).
- [ ] Commit Grafana dashboards JSON; link in README.
- [ ] Create K6 smoke script targetting hot paths.
- [ ] ZAP baseline workflow added.

---

## 🗣️ Communication Contract

- Status color: 🟢 on‑track / 🟡 risk / 🔴 blocked.
- All decisions → ADRs in `/docs/adr` (one page, template included).
- Demos twice per week; record & link.

---

## 🧠 Risk & Mitigation

- **Merge churn** → squash merges, codeowners, lockfile strategy.
- **Perf regressions** → budgets in CI, alerting, perf overlay.
- **Tenant bleed** → RBAC tests + negative E2E.
- **Copilot flakiness** → timeouts, circuit breaker, cached fallbacks.

---

## 📎 Appendices

**A. CODEOWNERS (example)**

```
* @owners/core
/ui/ @owners/frontend
/server/ @owners/backend
/ai/ @owners/ai
/tests/ @owners/qa
```

**B. Minimal CI (illustrative)**

```yaml
name: ci
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run lint
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm test -- --coverage
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run build
```

---

## 📣 Final Call‑to‑Action

> **Everyone**: adopt this prompt, enforce the gates, ship `v1.0.0‑rc1` this week. No untested merges, no late scope creep. If a change can’t pass the gates, it waits.
