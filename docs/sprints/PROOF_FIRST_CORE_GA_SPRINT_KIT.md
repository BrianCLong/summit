# Sprint Kit: "Proof-First Core GA" (2 Weeks)

> Copy/paste-ready artifacts to run the sprint end-to-end: epics, user stories, issue backlog, test plans, CI gates, PR/issue templates, board setup, and demo script.

---

## 0. Sprint Overview

- **Goal:** Ship a verifiable vertical slice—Provenance & Claim Ledger (beta) + NL→Cypher Copilot + ER service stub + SLO/Cost Guard + tri-pane UI integration—meeting near-term GA criteria.
- **Duration:** 10 working days (Mon–Fri ×2)
- **Success Metrics:**
  - p95 graph query latency < 1.5s on seeded dataset
  - NL→Cypher ≥ 95% syntactic validity on corpus; sandbox + undo/redo
  - Prov-Ledger external verification passes on golden fixtures
  - ER service merges reproducible with `/er/explain`
  - Tri-pane UI reduces time-to-path discovery vs. baseline
- **Out of Scope:** Federated multi-graph search; full Graph-XAI dashboards; advanced deception lab.

---

## 1. Epics → User Stories → Acceptance

### EPIC A: Provenance & Claim Ledger (beta)

| Story                                              | User Value                                                                        | Acceptance Criteria                                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1. Evidence Registration & Transform Tracking** | Analysts register evidence with immutable lineage to export verifiable manifests. | - `POST /evidence/register` persists source hash + metadata<br>- Transform steps recorded (operation, model+version, config checksum)<br>- Export produces `hash-manifest.json` (Merkle tree) |
| **A2. External Verifier (CLI)**                    | Compliance reviewers verify manifests independently.                              | - `prov-verify fixtures/case-demo` exits 0 on untampered bundle<br>- Tamper yields non-zero exit + human-readable diff                                                                        |
| **A3. License/Authority Blockers on Export**       | Approvers block non-compliant exports with reasons.                               | - Blocked export returns `{reason, license_clause, owner, appeal_path}`                                                                                                                       |

### EPIC B: NL→Cypher Copilot (auditable)

| Story                               | User Value                                                  | Acceptance Criteria                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **B1. Prompt→Preview→Sandbox Exec** | Analysts preview generated Cypher with cost before running. | - `nl_to_cypher(prompt, schema)` returns `{cypher, cost_estimate}`<br>- Sandbox execute returns preview; undo/redo supported |
| **B2. Quality & Safety Gates**      | Leads ensure ≥ 95% syntactic validity and safe rollback.    | - Test corpus produces ≥ 95% syntactic validity<br>- Diff vs. manual Cypher snapshot; rollback tested                        |

### EPIC C: Entity Resolution (v0)

| Story                                | User Value                              | Acceptance Criteria                                                                                  |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **C1. Candidate Generation & Merge** | Analysts adjudicate merges safely.      | - `/er/candidates`, `/er/merge` endpoints exist<br>- Merges reversible; audit includes user + reason |
| **C2. Explainability Endpoint**      | Analysts trust merges via transparency. | - `/er/explain` returns blocking features + scores + rationale                                       |

### EPIC D: Ops (SLO + Cost Guard)

| Story                                  | User Value                                          | Acceptance Criteria                                                |
| -------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| **D1. SLO Dashboards**                 | SREs monitor p95 graph latency for SLO enforcement. | - Dashboards deployed; alert fires under induced load              |
| **D2. Cost Guard (budgeter + killer)** | SREs manage cost and availability.                  | - Synthetic hog killed; event visible on dashboard & alert channel |

### EPIC E: UI – Tri-Pane + Explain View

| Story                                             | User Value                                    | Acceptance Criteria                                                                        |
| ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **E1. Tri-Pane Integration (graph/map/timeline)** | Users explore faster with synchronized panes. | - Brushing sync across panes; saved view works                                             |
| **E2. Explain This View**                         | Users see provenance overlays and policies.   | - Tooltip shows provenance & confidence opacity; “Explain” lists evidence nodes & policies |

---

## 2. Sprint Backlog (Issues)

| ID  | Description                                                      | Stack        | Estimate | Owner        |
| --- | ---------------------------------------------------------------- | ------------ | -------- | ------------ |
| A-1 | Implement `/evidence/register` (Go, repo `services/prov-ledger`) | Backend      | 5 SP     | Backend      |
| A-2 | Transform recorder middleware (Go)                               | Backend      | 3 SP     | Backend      |
| A-3 | Export `hash-manifest.json` (Merkle)                             | Backend      | 5 SP     | Backend      |
| A-4 | `prov-verify` CLI with diffing                                   | Tools        | 5 SP     | Tools        |
| A-5 | Export blocker policy evaluation (OPA pass-through)              | Backend      | 5 SP     | Backend      |
| B-1 | `nl_to_cypher` module + schema prompt composer (TS)              | AI/FE        | 8 SP     | FE/AI        |
| B-2 | Cost estimator & preview panel (TS)                              | FE           | 5 SP     | FE           |
| B-3 | Sandbox executor + undo/redo (TS)                                | FE           | 5 SP     | FE           |
| B-4 | Corpus + tests to ≥95% syntax validity                           | QA/AI        | 5 SP     | QA/AI        |
| C-1 | Blocking + candidate generation (Go)                             | Backend      | 5 SP     | Backend      |
| C-2 | `/er/merge` reversible merges + audit log                        | Backend      | 5 SP     | Backend      |
| C-3 | `/er/explain` (features + rationale)                             | Backend      | 3 SP     | Backend      |
| C-4 | Golden fixtures `er/golden/*.json`                               | Data         | 3 SP     | Data         |
| D-1 | OTEL traces + Prom metrics emitters                              | Platform     | 5 SP     | Platform     |
| D-2 | Dashboards JSON (p95, errors, Cost Guard)                        | Platform     | 3 SP     | Platform     |
| D-3 | Cost Guard plan budget + killer                                  | Platform     | 5 SP     | Platform     |
| D-4 | k6 load scripts + alert wiring                                   | Platform     | 5 SP     | Platform     |
| E-1 | Tri-pane shell & routing `/case/:id/explore`                     | FE           | 5 SP     | FE           |
| E-2 | Sync brushing across panes                                       | FE           | 5 SP     | FE           |
| E-3 | Explain overlay + provenance tooltips                            | FE           | 5 SP     | FE           |
| E-4 | Cypress benchmarks + screenshot diffs                            | QA/FE        | 3 SP     | QA/FE        |
| F-1 | RSS/News connector w/ manifest & tests                           | Integrations | 5 SP     | Integrations |
| F-2 | STIX/TAXII connector                                             | Integrations | 5 SP     | Integrations |
| F-3 | CSV ingest wizard + PII flags                                    | Integrations | 5 SP     | Integrations |

---

## 3. Team Setup & Cadence

- **Board Columns:** Backlog → Ready → In Progress → In Review → QA/Acceptance → Done
- **Daily Standup (10 min):**
  - What moved SLO/acceptance needles?
  - What’s blocked?
  - Today’s single critical path item.
- **Ceremonies:**
  - Sprint Planning (90 min) — scope & capacity
  - Mid-sprint Review (30 min) — metric checks + risk triage
  - Sprint Review/Demo (45 min)
  - Retro (30 min) — “start/stop/continue” + action owners

---

## 4. Definition of Ready (DoR)

- User story has acceptance criteria + test fixture path.
- Service owner, codeowners set; rollback plan noted.
- Telemetry & security requirements stated (metrics, traces, auth scope).

## 5. Definition of Done (DoD)

- CI green: unit + contract + acceptance packs.
- Artifact(s): dashboard JSON, CLI logs, screenshot diffs attached.
- Docs updated (README + runbooks); audit log entries verified.

---

## 6. CI/CD Gates (GitHub Actions Outline)

```yaml
name: ci
on:
  pull_request:
    branches: [main]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Go build & test
        run: |
          make go-build
          go test ./... -count=1 -race -cover
      - name: Node build & test
        run: |
          npm ci
          npm run lint
          npm test -- --runInBand
      - name: Contract tests
        run: make contract-test
      - name: Acceptance packs
        run: make acceptance
      - name: k6 load (smoke)
        run: k6 run tests/load/smoke.js
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: acceptance-evidence
          path: |
            artifacts/**/*
            coverage/**/*
```

---

## 7. Issue & PR Templates (Drop-In)

**`.github/ISSUE_TEMPLATE/feature_request.md`**

```markdown
---
name: Feature request
about: Propose a capability or improvement
labels: feat, needs-triage
---

## User Story

As a <role>, I want <capability> so that <outcome>.

## Acceptance Criteria

- [ ]
- [ ]

## Non-Goals

-

## Telemetry & Security

Metrics:
Traces:
Auth scope:

## Test Fixtures

Path(s):

## Dependencies

-
```

**`.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
---
name: Bug report
about: Help us fix a defect
labels: bug, needs-triage
---

## Summary

## Steps to Reproduce

1.
2.

## Expected vs Actual

## Logs/Artifacts

## Impact

## Owner & Environment
```

**`.github/pull_request_template.md`**

```markdown
## What

## Why

## How (Design/Implementation)

## Acceptance Evidence

- [ ] Unit tests
- [ ] Contract tests
- [ ] Acceptance pack output attached (screenshots, CLI logs)
- [ ] Dashboards updated (link)

## Risk & Rollback

## Checklist

- [ ] Codeowners approved
- [ ] Security review (if policy/export touching)
- [ ] Telemetry added (metrics/traces)
```

---

## 8. Branching, Commits, Labels

- **Branching:** Trunk-based; `feat/<epic>-<short>`; `fix/<area>-<short>`.
- **Commits:** Conventional Commits (e.g., `feat(er): reversible merges + audit log`).
- **Labels:** `feat`, `bug`, `infra`, `ops`, `security`, `ui`, `backend`, `ai`, `docs`, `blocked`, `good-first-issue`, `needs-triage`.

---

## 9. Test Plans

### 9.1 Acceptance Packs

- **Prov-Ledger:** Run `prov-verify` against `fixtures/case-demo` → expect exit 0; tamper → nonzero + diff.
- **NL→Cypher:** Run corpus → ≥ 95% syntactic validity; snapshot diffs preserved.
- **ER:** Reproduce merges; `/er/explain` returns features + rationale JSON.
- **Ops:** k6 script triggers alert; dashboards updated; Cost Guard logs a kill.
- **UI:** Cypress time-to-path benchmark; screenshot diffs of Explain overlay.

### 9.2 k6 Smoke Script (Skeleton)

```js
import http from 'k6/http';
import { sleep, check } from 'k6';
export const options = { vus: 10, duration: '2m' };
export default function () {
  const r = http.post('https://api.local/query', {
    cypher: 'MATCH (n)-[r*1..3]->(m) RETURN n LIMIT 100',
  });
  check(r, {
    'status 200': (res) => res.status === 200,
    'latency ok': (res) => res.timings.duration < 1500,
  });
  sleep(1);
}
```

---

## 10. Observability & Dashboards

- **Metrics:** `graph_query_latency_ms`, `query_errors_total`, `cost_guard_kills_total`.
- **Traces:** Span names for `/evidence/register`, `/er/*`, `nl_to_cypher`, `sandbox_execute`.
- **Dashboards:** SLO p95 latency, Error rate, Cost Guard actions.

---

## 11. Security & Policy

- OIDC + WebAuthn step-up for export actions.
- OPA pass-through on export & query exec; policy dry-run endpoint.
- Audit log for merges/exports includes user, reason, timestamp, policy ID.

---

## 12. Demo Script (Sprint Review)

1. Register evidence → show manifest tree.
2. Tamper a file → `prov-verify` fails with diff.
3. NL prompt → preview Cypher + cost → sandbox exec → undo/redo.
4. ER candidates → merge → explain.
5. k6 load → see SLO dashboard + Cost Guard event.
6. Tri-pane exploration → “Explain this view” overlay.

---

## 13. Runbooks (Brief)

- **Incident: Query Latency Breach** → enable Cost Guard kill → capture trace → attach dashboard link to issue.
- **Rollback:** Disable new copilot feature flag; revert ER merge via `/er/merge?revert`.

---

## 14. Folder Structure (Proposed)

```
services/
  prov-ledger/
  er-service/
  cost-guard/
apps/
  web/
packages/
  query-copilot/
  api-gateway/
charts/
  prov-ledger/
  er-service/
  cost-guard/
  api-gateway/
fixtures/
  case-demo/
  er/golden/
 tests/
  corpus/
  load/
  e2e/
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
```

---

## 15. RACI (Condensed)

| Function     | Scope                                            |
| ------------ | ------------------------------------------------ |
| Backend      | Prov-Ledger, ER service                          |
| FE/AI        | NL→Cypher UI + corpus, tri-pane, explain overlay |
| Platform/SRE | OTEL/Prom, dashboards, k6, Cost Guard            |
| Integrations | Connectors golden path                           |
| QA           | Acceptance packs, Cypress, screenshot diffs      |
| Security     | OPA/ABAC, export blockers, WebAuthn              |

---

### ✅ Ready to Run

Create the issues from Section 2, apply templates from Section 7, wire the CI from Section 6, and follow the demo script in Section 12. This completes the sprint scaffolding with measurable outcomes.
