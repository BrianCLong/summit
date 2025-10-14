# IntelGraph — Sprint 18 Auto‑Seed Pack (v1.0)

**Slug:** `intelgraph-sprint-2025-10-06_auto-seed-pack_v1.0`  
**Covers:** Jira CSV import, repo scaffolds, PR/Issue templates, Makefile tasks  
**Sprint:** Oct 6–17, 2025 • `Sprint 18 (Oct 6–17, 2025)`  
**Fix Version/s:** `2025.10.r1`

---

## 1) Jira CSV — Epics & Stories (import via *Jira Admin → System → External System Import → CSV*)
> Notes:
> - Keep the header row intact.
> - `Epic Name` is required for Epics.
> - Use `Epic Link` to associate Stories/Tasks to Epics.
> - If your Jira uses "Parent" instead of "Epic Link" for Story→Epic in Team‑managed projects, duplicate that column accordingly.
> - Adjust `Project Key`, `Assignee`, and `Reporter` as needed.

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Story Points,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Epic Name,Epic Link
Epic,IG,EPIC: Proof‑Carrying Analytics (PCA) Alpha,"Deterministic DAG + attestations + PCQ manifest + verifier service.",Highest,"proof-carrying,pcq,trust","trust-fabric",,pm@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,PCA Alpha,
Epic,IG,EPIC: License/Authority Compiler (LAC) Beta,"Policy DSL v0.6 + WASM compiler + runtime gate + diff simulator.",Highest,"policy-compiler,governance","gov-ops",,pm@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,LAC Beta,
Epic,IG,EPIC: Case Spaces M0,"Case CRUD + roles/SLA + 4‑eyes + disclosure packager v0.",High,"case-space,tri-pane","graph-core",,pm@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,Case Spaces M0,
Epic,IG,EPIC: Observability & Ops,"OTEL traces, Prom metrics, SLO dashboards, chaos drill stub.",High,"slo,observability,otel","gov-ops",,pm@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,Obs & Ops,
Epic,IG,EPIC: Copilot/UX Glue,"Guardrail reasoner surface + provenance tooltips.",Medium,"ux,guardrails,tri-pane","ux-copilot",,pm@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,Copilot Glue,
Story,IG,PCA: Deterministic DAG runner,"Implement content‑addressed nodes, stable ordering, recorded seeds. Acceptance: identical manifests on rerun; tamper alarm.",High,"proof-carrying,pcq","trust-fabric",8,eng-trust@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-10,,PCA Alpha
Story,IG,PCA: Node attestation schema,"Capture input hashes, model cards, hyperparams, checksum tree. Acceptance: attestation visible in manifest + UI provenance pill.",High,"proof-carrying,pcq","trust-fabric",5,eng-trust@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-13,,PCA Alpha
Story,IG,PCA: PCQ manifest writer,"Emit *.pcq JSON with Merkle proofs, sign with tenant key. Acceptance: verifier validates 5 golden flows.",High,"pcq,trust","trust-fabric",5,eng-trust@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-14,,PCA Alpha
Story,IG,PCA: Verifier CLI + stage service,"CLI `pcq verify`; stage service replays DAG; PASS/FAIL + diff. Acceptance: tolerances enforced; failures block export.",Medium,"pcq,cli","trust-fabric",8,eng-trust@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-16,,PCA Alpha
Story,IG,LAC: DSL v0.6 grammar,"Extend grammar for licenses, warrants, retention clocks, purpose tags; unit clause library. Acceptance: 100% policy hit‑rate on test corpus.",High,"policy-compiler,governance","gov-ops",5,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-09,,LAC Beta
Story,IG,LAC: Compiler → WASM bytecode,"Deterministic bytecode; embed policy IDs; `evaluate(queryCtx)` ABI. Acceptance: unsafe ops blocked; reason cites authority.",High,"policy-compiler,wasm","gov-ops",8,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-14,,LAC Beta
Story,IG,LAC: Runtime gate with explainers,"Query‑time gate; reason strings and appeal link. Acceptance: stage blocks unsafe path; audit log records rationale.",Medium,"governance,guardrails","gov-ops",5,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-15,,LAC Beta
Story,IG,LAC: Inline diff simulator,"Run historical queries under candidate policy; produce allow/deny diff + impact report. Acceptance: CSV/HTML downloadable + audit ref.",Medium,"policy-diff,governance","gov-ops",5,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-16,,LAC Beta
Story,IG,Case Spaces: CRUD + roles + SLA,"Create/read/update cases; assign roles; SLA timers & breach alerts; legal hold flag. Acceptance: edits/audits visible; delete blocked on hold.",High,"case-space,governance","graph-core",8,eng-graph@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-13,,Case Spaces M0
Story,IG,Case Spaces: 4‑eyes control,"Dual‑control for risky exports/actions; approver workflow. Acceptance: sensitivity >X requires second approver.",Medium,"case-space,governance","graph-core",5,eng-graph@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-15,,Case Spaces M0
Story,IG,Disclosure Packager v0,"Bundle evidence + PCQ + license terms; hash tree; audience filters. Acceptance: external validator flags mods; revocation propagates.",High,"pcq,case-space","graph-core",8,eng-graph@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,,Case Spaces M0
Task,IG,OTEL/Prom metrics + SLO dashboard,"p95 query latency, ingest E2E panels; cost guard stub.",Medium,"observability,slo","gov-ops",5,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-10,,Obs & Ops
Task,IG,Chaos drill (dev) stub + runbook,"Single pod kill; verify auto‑recovery; alert fired; document runbook.",Low,"chaos,runbook","gov-ops",3,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-16,,Obs & Ops
Task,IG,Guardrail reasoner pane,"Blocked by policy panel with policy ID + explainer; copy reviewed by Gov/Ops.",Medium,"ux,guardrails","ux-copilot",3,ux@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-14,,Copilot Glue
Task,IG,Tri‑pane provenance tooltips,"Confidence/lineage badges on nodes/edges; link to manifest summary.",Low,"ux,provenance","ux-copilot",3,ux@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-15,,Copilot Glue
Task,IG,QA: Golden fixture set & E2E gates,"Seed 5 golden flows; ensure verifier PASS blocks release if failing.",Medium,"qa,pcq","qa-release",5,qa@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-16,,Obs & Ops
```

---

## 2) Repo Scaffolds (bash)
Create directories, placeholder specs, and runbooks.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Root scaffolds
mkdir -p docs/specs docs/runbooks docs/adr cli/pcq .github/ISSUE_TEMPLATE .github/workflows dashboards
mkdir -p services/{trust-fabric,gov-ops,graph-core,ux-copilot}
mkdir -p services/trust-fabric/{dag,pcq,verifier}
mkdir -p services/gov-ops/{lac-compiler,lac-runtime,policy-diff}
mkdir -p services/graph-core/{case,disclosure}
mkdir -p services/ux-copilot/{guardrails,provenance}

# Placeholders
cat > docs/specs/PCA-alpha.md <<'MD'
# PCA Alpha Spec
- Deterministic DAG, attestations, PCQ manifest, stage verifier.
MD

cat > docs/specs/LAC-beta.md <<'MD'
# LAC Beta Spec
- DSL v0.6, WASM compiler, runtime gate, diff simulator.
MD

cat > docs/specs/CaseSpaces-M0.md <<'MD'
# Case Spaces M0 Spec
- CRUD, roles/SLA, 4‑eyes, disclosure packager v0.
MD

cat > docs/runbooks/verifier-replay.md <<'MD'
# Runbook: Verifier Replay
1) `cli/pcq verify --manifest <path>`
2) Investigate diffs, pin seeds, re‑run.
MD

cat > docs/runbooks/policy-diff.md <<'MD'
# Runbook: Policy Diff Simulator
1) POST /policy/simulate with draft + query set
2) Export CSV/HTML and attach to audit.
MD

cat > docs/adr/2025-10-06-pca-determinism.md <<'MD'
# ADR: Deterministic Execution for PCA
Status: Proposed
Decision: Content‑addressed IO + seeded RNG + sorted iterators.
MD

cat > CHANGELOG.md <<'MD'
# Changelog
## 2025.10.r1
- Sprint 18 foundations (PCA alpha, LAC beta, Case Spaces M0).
MD
```

---

## 3) GitHub Issue Templates (drop in `.github/ISSUE_TEMPLATE/`)

### 3.1 `user_story.md`
```md
name: User Story
about: Feature slice deliverable
labels: story
body:
- type: textarea
  attributes:
    label: As a (role), I want (capability), so that (verifiable outcome)
- type: textarea
  attributes:
    label: Acceptance Criteria
    description: Use Given/When/Then; include PCQ/LAC hooks
- type: input
  attributes:
    label: Feature Flag
- type: textarea
  attributes:
    label: Telemetry & SLO
- type: textarea
  attributes:
    label: Risks & Mitigations
```

### 3.2 `bug_report.md`
```md
name: Bug Report
about: Something broke or deviates from acceptance
labels: bug
body:
- type: textarea
  attributes:
    label: Expected vs Actual
- type: textarea
  attributes:
    label: Repro Steps
- type: textarea
  attributes:
    label: Logs / PCQ Manifest / Policy IDs
- type: dropdown
  attributes:
    label: Severity
    options: [S1-Blocker, S2-Critical, S3-Major, S4-Minor]
```

---

## 4) Pull Request Template (`.github/pull_request_template.md`)
```md
## What’s in this PR
-

## Acceptance & Tests
- [ ] Unit/contract tests added
- [ ] E2E golden flows pass
- [ ] PCQ manifest verified (attach artifact link)
- [ ] Policy impact diff attached (if LAC)

## Flags & Telemetry
- Feature flag:
- Events/SLO updated:

## Risk & Rollback
- Rollback plan:
```

---

## 5) Makefile (root) — helpful commands
```make
.PHONY: verify pcq build dash chaos

verify:
	cli/pcq/pcq verify --manifest $(MANIFEST)

pcq:
	$(MAKE) -C services/trust-fabric/pcq build

build:
	for s in services/*/* ; do echo "Building $$s" ; done

dash:
	open dashboards/slo-dashboard.json || true

chaos:
	kubectl delete pod -l app=intelgraph --namespace=dev --wait=false
```

---

## 6) Minimal SLO Dashboard Stub (`dashboards/slo-dashboard.json`)
```json
{
  "title": "IntelGraph SLO",
  "panels": [
    { "type": "timeseries", "title": "p95 Query Latency" },
    { "type": "timeseries", "title": "Ingest E2E Duration" },
    { "type": "stat", "title": "Policy Blocks (count)" }
  ]
}
```

---

## 7) Versioning
- **v1.0 (2025‑09‑29):** Initial auto‑seed pack aligned to Sprint 18.

