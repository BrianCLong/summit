awesome—thanks for the trust. I pulled apart the October pack and the full `summit` repo you provided (zips), mapped the active sprint scaffolds (IntelGraph + Maestro Conductor + Company OS), and synthesized a workstream that both fits your cadence and closes gaps I see “around the corners.”

Below is my **first-response package** in your requested format, plus a tight kickoff prompt that plugs straight into our cadence.

---

# 1) Mission Decomposition
**Mission:** Convert Summit’s Q4 plan into provably *defensible*, *operationally hard*, and *commercially licensable* tech—centered on: (a) provenance-first execution, (b) cost/perf guardrails, (c) bitemporal IntelGraph, (d) Maestro Conductor GA runtime & UI shell, (e) audit-ready governance.

**Workstreams (mine, integrated):**
- **W1 — Prov-First Core GA:** Provenance ledger + attestations, policy compiler, verifiable ER pipeline, export/consent gates.
- **W2 — IntelGraph Hardening:** Schema registry + bitemporal time-travel, NL→Cypher, GraphRAG guardrails, adjudication UI.
- **W3 — Cost Guard + RL Tuner:** Request shaping, cache strategy, autoscale policies, RL controller w/ safe fallback.
- **W4 — Conductor Shell & Observability:** Tri-pane UI, action ledger, SLOs/p95/p99, red-team & policy-fuzzer.
- **W5 — IP & Compliance Railguards:** Patent scaffolds, FTO notes, SPDX/SBOM, SLSA provenance, data governance.

---

# 2) Novelty Hunt Plan (hypotheses)
- **H1: “Prov-contracts”** — Compile *policy + consent + data lineage* into an *on-path executable contract* (OPA/ABAC + PII gates) that emits signed proof objects and blocks side-channels.
- **H2: “Bitemporal ER-adjudication”** — Joint entity resolution over valid-time + transaction-time with *adjudication explanations* (XAI overlays) that are *prov-verifiable*.
- **H3: “Cost Guard RL-safe”** — A constrained RL policy for autoscale/cache/HPA that *never* violates SLO/Spend bounds; with formal guards + rollback.
- **H4: “Prov-verified LLM IO”** — Bound LLM graph ops (NL→Cypher, GraphRAG) by *prov scopes* + *data-use purposes*; every answer carries a verifiable evidence bundle.
- **H5: “Policy Fuzzer”** — Coverage-guided fuzzing of Rego + data-path combinatorics to surface privacy/policy bypasses pre-GA.

---

# 3) Prior-Art Shortlist (delta focus)
1) OPA/Rego (policy) → **Delta:** on-path *prov-contract* compiler + proof artifact schema.
2) Google Zanzibar/SpiceDB (authz) → **Delta:** add *consent/purpose*, bitemporal edges, and evidence binding.
3) LakeFS / Delta Lake (lineage) → **Delta:** *transaction-time + valid-time* ER with adjudication UI.
4) K8s HPA/VPA (autoscaling) → **Delta:** *SLO/Spend-constrained RL* with formal guardrails and prov traces.
5) GraphRAG/NL2Cypher (LLM) → **Delta:** *scope-aware compilation* and *proof-bundled responses*.
6) SLSA in supply chain → **Delta:** unify *runtime data-use provenance* with build provenance.

(*I’ll maintain `/ip/prior_art.csv` with precise cites + claim deltas.*)

---

# 4) Architecture Sketch
**Core idea:** every data-touching action emits **EVIDENCE** (hash-chained, signed), and every decision is checked against a compiled **PROV-CONTRACT**.

```
[User/Service] → [Conductor Actions] → [Policy Compiler → PROV-CONTRACT]
       │                                   │
       ├──> [IntelGraph API] ── NL→Cypher ─┼──> [Evidence Emitter ⟂ Audit Bus]
       │                                   │
       ├──> [Cost Guard] ← metrics/SLO ----┘
       │
       └──> [Prov Ledger (WORM+hash chain)] ← [Policy Fuzzer, Red Team]
```

**Key components (repos/dirs I’ll touch):**
- `sprint-kits/proof-first-core-ga/` → APIs, charts, CI, policy export.
- `project_management/epics/*` → epics/issues wiring.
- `services/{prov-ledger, er-service, cost-guard}/` → service kernels.
- `conductor-ui/` & `apps/*` → tri-pane shell + overlays.
- `policy-fuzzer/` → coverage-guided engine and seeds.
- `observability/`, `monitoring/`, `policy/` → SLOs, rules, OPA bundles.

---

# 5) Experiment Plan
**Datasets/fixtures:** synthetic PII/customer graph, seeded ER conflicts, cost/load traces, policy suites with expected outcomes.

**Metrics & KPIs**
- *Prov:* % actions with valid evidence, verification latency, chain integrity.
- *Graph:* ER F1, adjudication latency, time-travel correctness.
- *Cost/Perf:* p95/p99 latency, cache hit-rate, $/1k ops, SLO miss rate.
- *Policy:* rule coverage, bypass rate (should → 0), mean time-to-detect.
- *LLM:* NL→Cypher accuracy, GraphRAG groundedness (attributed sources).

**Ablations**
- RL controller on/off; safe-guards on/off
- Provenance enforcement on/off
- Bitemporal vs uni-temporal queries
- Policy-fuzzer seeds vs random

---

# 6) Patent Angles (candidate claims)
- **Independent (method):** Compiling data-use *prov-contracts* that gate execution and emit verifiable evidence bundles for each action and LLM output.
- **Independent (system/CRM):** Bitemporal ER-adjudication graph service that generates policy-bound explanations and anchors them in a hash-chained ledger.
- **Dependent:** purpose-limited scopes; consent revision propagation; RL safety envelopes; rollback + notarized deltas; XAI overlays; SLSA+runtime provenance unification; cache/LLM scope-aware compilation; policy-fuzzer guided by coverage and lineage graphs.

(*/ip/draft_spec.md and claims.md will be delivered with ≥2 indep + ≥8 dep claims.*)

---

# 7) Commercialization Hooks
- **Licensable units:** Prov-contract compiler, Prov-ledger service, Cost Guard controller, Policy Fuzzer, IntelGraph bitemporal module, Conductor tri-pane UI kit, Audit SDK.
- **Targets:** Regulated SaaS, Fin/Health, Gov/Defense, Data platforms, Graph DB vendors.
- **Pricing:** per-core (runtime), per-action (prov), per-seat (UI), per-cluster (policy/cost guard), OEM/royalty for DB vendors.

---

# 8) Risks & Mitigations
- **Integration sprawl:** lock interfaces + contract tests.  
- **Policy regressions:** policy-fuzzer + CI gates + golden bundles.  
- **RL instability:** constraints + shadow mode + rollback + invariants.  
- **Prov overhead:** batched signing, async attest + p95 budgets.  
- **Data governance:** PII scanners, redactors, consent scopes; DPIA templates.

---

# 9) Delivery Plan & Milestones (DoD-aligned)
**Cadence anchors (matches your plan):**
- **Daily:** 15-min dispatch + p95/p99/err heatmap, block/risk.
- **Weekly:** Portfolio & Risk; demo *prov evidence* diff; burn-up vs SLO.
- **Bi-weekly sprints (2w):** releasable increments with *Release Gate* (tests/docs/disclosure/owner dashboards).
- **Monthly:** Strategy + Metrics pack; IP update (claims churn).
- **Quarterly:** Board brief; roadmap reprioritization.

**Sprint 1 (Oct 6–17)** *Prov-First Core GA — foundations*  
- Prov-contract compiler (MVP) + OPA bundle; evidence schema + signer; ER-service bitemporal index skeleton; Conductor tri-pane scaffold; Observability p95/p99 SLOs.  
**Exit:** all writes emit evidence stubs; CI verifies chain; demo NL→Cypher stub within scopes.

**Sprint 2 (Oct 20–31)** *Cost Guard & IntelGraph*  
- RL-safe controller (shadow); cache/hints + autoscale policies; ER adjudication queue; NL→Cypher compiler w/ scope pruning; Policy-fuzzer v0.  
**Exit:** p95 −10% vs baseline; zero SLO violations in shadow; policy coverage ≥80%.

**Sprint 3 (Nov 3–14)** *Prov-verified LLM I/O*  
- GraphRAG with source binding; proof bundles attached to answers; adjudication UI overlays; DPIA template pass.  
**Exit:** 100% LLM answers carry verifiable sources; adjudication explainers.

**Sprint 4 (Nov 17–28)** *Hardening & GA Gate*  
- Perf: cache tiering; prov batching; RL active. Security reviews; SBOM/SPDX; SLSA provenance.  
**Exit:** GA readiness doc; DR/rollback drills; zero known P0.

**Sprint 5 (Dec 1–12)** *Design-to-Win & IP*  
- Customer-shaped scenarios; integration kits; claims solidification; benchmark report.  
**Exit:** patent drafts (≥2 indep, ≥8 dep); licensable units enumerated.

**Sprint 6 (Dec 15–26)** *Stabilize & Release*  
- Bug burn-down; policy diff tooling; playbooks; pricing one-pagers.  
**Exit:** release notes + GTM brief; training assets.

**Definition of Done (every increment):** `make bootstrap && make test && make run` green; Repro Pack complete; CI passing; seeds documented; evidence verification passes; p95/p99 within SLO; disclosure pack present.

---

## Kickoff Prompt (my workstream)
```json
{
  "mission": "Ship Prov-First Core GA + IntelGraph bitemporal adjudication + Cost Guard RL-safe + Conductor tri-pane with prov-verified LLM IO.",
  "constraints": ["p95<150ms", "evidence verify<10ms median", "no PII exfil", "Apache-2.0 only", "rollback in <5m"],
  "target_products": ["Summit", "IntelGraph", "Maestro Conductor"],
  "repos": ["github.com/{{ORG}}/summit"],
  "success_metrics": [">=10% p95 improvement vs Sprint-25", "0 SLO-violating actions", "100% actions carry evidence", ">=80% policy coverage", "NL→Cypher exact-match>=85%"],
  "deliverable_emphasis": ["patent", "runtime", "benchmark"],
  "timebox_days": 14
}
```

---

## Repro Pack (to be checked in)
```
/design/      problem.md, novelty-matrix.md, threat-model.md
/spec/        prov-contracts.md, bitemporal-er.md, cost-guard-rl.md, APIs.md
/impl/        services/{prov-ledger,er-service,cost-guard}/, conductor-ui/, policy-fuzzer/, sdk/
              make/Makefile, cli/, ci/github-actions.yml, seeds/, fixtures/
/experiments/ configs/, run.sh, eval_harness.py, plots/, tables/
/benchmark/   kpis.md, baselines.md, datasets.md, stats.md
/ip/          draft_spec.md, claims.md, prior_art.csv, fto.md, lab-notes.md
/compliance/  LICENSES/, SPDX.SBOM.json, SLSA.provenance.json, data-governance.md
/integration/ sdk-stubs/, examples/, release-notes.md
```

---

## Gaps I’m closing (from the October pack & repo)
- **Evidence unification:** multiple partial ledger/policy artifacts—no single *proof bundle* format; I’ll define/standardize and wire CI verification.
- **Scope-aware NL→Cypher:** scaffolds exist but lack *purpose/consent* pruning; I’ll implement compiler passes that honor prov-contracts.
- **Autoscale “safe policy”:** tuning tasks present; missing *formal safe envelope* + rollback drills; I’ll add invariants + shadow rollout.
- **Policy regression surface:** policy-fuzzer not integrated into CI; I’ll add coverage gates, seed corpora, and bypass detectors.
- **SLSA↔Runtime link:** supply-chain provenance present; I’ll connect build attestations with runtime *data-use* evidence.

---

## Next-Steps Kanban (week 1)
- [ ] Land `/spec/prov-contracts.md` + evidence schema (v0).
- [ ] Implement evidence emitter + signer; CLI `prov verify`.
- [ ] Wire OPA bundle build + policy pack tests in CI.
- [ ] NL→Cypher compiler skeleton + scope pruning (tests).
- [ ] Cost Guard controller (shadow) + invariants + rollback script.
- [ ] Observability dashboards (p95/p99/SLO) + alerts.
- [ ] Draft `/ip/draft_spec.md` with claim map.
- [ ] SPDX/SBOM generation in CI.

If you want, I’ll spin the initial branches/PRs and push the skeletons with owners and CODEOWNERS set to your cadence.



---

# 10) Repo Wiring — Branching, PR/CODEOWNERS, CI, Makefile (ready to drop in)

## Branch Strategy
- `main` → protected, release-only, tags `vMAJOR.MINOR.PATCH`.
- `develop` → integration branch; auto-deploys to staging.
- `release/sprint-2025-10A` → bi-weekly release branches (A/B per month).
- `feature/<ws>-<short-desc>` (e.g., `feature/w1-prov-contracts`), `fix/<ticket>`, `exp/<hypothesis>`.
- Conventional Commits required: `feat:`, `fix:`, `perf:`, `docs:`, `refactor:`, `test:`, `chore:`.

## PR Template (`.github/PULL_REQUEST_TEMPLATE.md`)
```markdown
# Summary
- [ ] Problem & scope
- [ ] Approach & design notes
- [ ] Risk & rollback plan

## Definition of Done
- [ ] `make test` green locally
- [ ] Evidence bundles added where applicable
- [ ] Policies/OPA updated + tests
- [ ] Telemetry (p95/p99, errors) added
- [ ] SBOM/SPDX updated
- [ ] Licenses reviewed (Apache-2.0 preferred)

## Screenshots/Artifacts
- [ ] Logs/plots attached
- [ ] Demo script/Make target

## Links
Issues: #
Docs: 

## Checklist
- [ ] Security review (PII/consent)
- [ ] Feature flags & config
- [ ] Backwards compatibility
- [ ] Benchmarks included (if perf)
```

## CODEOWNERS (`.github/CODEOWNERS`)
```text
# Global reviewers
*                                   @brianclong @summit-core @aurelius-ig

# Workstreams
/services/prov-ledger/              @aurelius-ig @summit-core
/services/er-service/               @aurelius-ig @intelgraph-team
/services/cost-guard/               @aurelius-ig @platform-perf
/conductor-ui/                      @maestro-ui @aurelius-ig
/policy/                            @privacy-gov @aurelius-ig
/observability/                     @sre-ops @aurelius-ig
/.github/                           @dev-infra @aurelius-ig
```

## Issue Templates (`.github/ISSUE_TEMPLATE/`)
### `bug_report.md`
```markdown
name: Bug report
title: "bug: <area>: <summary>"
labels: [bug]
---
**Describe**
**Repro/Logs**
**Expected**
**Environment**
**Evidence impact** (prov bundles affected?)
**Rollback ready?**
```

### `feature_request.md`
```markdown
name: Feature request
title: "feat: <area>: <summary>"
labels: [enhancement]
---
**Problem/Use-case**
**Proposed solution**
**Policy/Consent implications**
**Telemetry & KPIs**
**DoD**
```

### `policy_violation.md`
```markdown
name: Policy violation
title: "policy: <scope>: <summary>"
labels: [security, policy]
---
**Violation**
**Expected policy**
**Evidence bundle** (hash/id)
**Blast radius**
**Mitigation/Actions**
```

## CI (GitHub Actions) `.github/workflows/ci.yml`
```yaml
name: ci
on:
  push:
    branches: [develop, 'feature/**', 'fix/**', 'release/**']
  pull_request:
    branches: [develop, main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
      - name: Bootstrap
        run: make bootstrap
      - name: Lint
        run: make lint
      - name: Test
        run: make test
      - name: Build SBOM
        run: make sbom
      - name: Generate provenance
        run: make provenance
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: artifacts
          path: |
            dist/
            reports/
            sbom/
  codeql:
    uses: github/codeql-action/.github/workflows/codeql.yml@v3
    with:
      languages: python
```

## Makefile (root `Makefile`)
```make
.PHONY: bootstrap lint test run sbom provenance verify demo
PY?=python3.11

bootstrap:
	$(PY) -m pip install -U pip wheel
	$(PY) -m pip install -r requirements.txt -r requirements-dev.txt || true

lint:
	$(PY) -m pip install ruff || true
	ruff check .
	ruff format --check .

evidence_dir?=./evidence
verify:
	$(PY) -m prov.verify $(evidence_dir)

test:
	$(PY) -m pytest -q --maxfail=1 --disable-warnings --junitxml=reports/junit.xml --cov=.

run:
	$(PY) -m apps.conductor

sbom:
	mkdir -p sbom
	syft . -o cyclonedx-json > sbom/sbom.json || true

provenance:
	mkdir -p reports
	$(PY) -m tools.provenance.emit --out reports/provenance.jsonl || true

demo:
	$(PY) -m demos.prov_contracts
```

## Starter `requirements*.txt`
```text
# requirements.txt
fastapi
uvicorn
pydantic
opa-bundle==0.1.*
networkx

# requirements-dev.txt
pytest
pytest-cov
ruff
syft
```

## Directory Additions
```
/.github/
  CODEOWNERS
  PULL_REQUEST_TEMPLATE.md
  /ISSUE_TEMPLATE/
    bug_report.md
    feature_request.md
    policy_violation.md
  /workflows/ci.yml
/services/
  prov-ledger/
  er-service/
  cost-guard/
/conductor-ui/
/policy/
/observability/
/tools/provenance/
/demos/
```

## Label Set (create once)
```bash
# Requires GitHub CLI (gh)
 gh label create bug --color FF0000 --description "Defect"
 gh label create enhancement --color 84b6eb --description "Feature"
 gh label create policy --color 5319e7 --description "Policy/Consent"
 gh label create perf --color 1d76db --description "Performance"
 gh label create security --color b60205 --description "Security"
 gh label create docs --color 0e8a16 --description "Documentation"
 gh label create tech-debt --color d93f0b --description "Refactor/cleanup"
 gh label create prov --color 0366d6 --description "Provenance"
```

## Protected Branch Rules (proposed)
- `main`: require PR, 2 approvals, status checks (`build-test`, `codeql`), signed commits, linear history, dismiss stale reviews.
- `develop`: require PR, 1 approval, status checks, allow squash/merge, no direct pushes by bots.

## Initial Issues/PRs (to open today)
1. **infra:** add CI workflow, PR templates, CODEOWNERS, labels.
2. **spec:** add `/spec/prov-contracts.md` + evidence schema v0.
3. **impl:** scaffold `services/prov-ledger` with signer + CLI `prov verify`.
4. **impl:** scaffold `services/er-service` with bitemporal index skeleton.
5. **impl:** `conductor-ui` tri-pane shell (blank panes + router).
6. **tools:** `policy-fuzzer` skeleton + seed corpora.
7. **obs:** dashboards for p95/p99/SLO (placeholders + metrics contract).
8. **ip:** create `/ip/draft_spec.md` + `/ip/prior_art.csv` headers.

## Branch/PR Commands (copy-paste)
```bash
git checkout -b infra/bootstrap
mkdir -p .github/ISSUE_TEMPLATE services/{prov-ledger,er-service,cost-guard} policy observability tools/provenance demos
# add files above…
git add . && git commit -m "chore(infra): bootstrap CI, templates, CODEOWNERS, labels"
git push -u origin infra/bootstrap
# open PR
gh pr create --fill --base develop --title "chore(infra): bootstrap" --label docs,tech-debt
```

---

# 11) Owners & RACI (placeholders to confirm)
- **Architect (A):** @aurelius-ig
- **Prov Ledger (R):** @aurelius-ig, (C) @summit-core, (I) @privacy-gov
- **ER Service (R):** @intelgraph-team, (C) @aurelius-ig, (I) @summit-core
- **Cost Guard (R):** @platform-perf, (C) @aurelius-ig, (I) @sre-ops
- **Conductor UI (R):** @maestro-ui, (C) @aurelius-ig, (I) @summit-core
- **Policy Fuzzer (R):** @privacy-gov, (C) @aurelius-ig, (I) @dev-infra
- **Observability (R):** @sre-ops, (C) @aurelius-ig
- **IP/Compliance (R):** @legal-ip, (C) @aurelius-ig

> Replace placeholders with your actual teams; I can map to real handles if you paste the roster.

---

# 12) Rollout Order (Day 0–3)
- Day 0: merge `infra/bootstrap` → `develop`; enable branch protections; create labels.
- Day 1: land `/spec/prov-contracts.md`; wire `prov.verify` CLI; CI starts publishing SBOM + provenance.
- Day 2: check in ER skeleton + UI shell; open tracking issues; start shadow dashboards.
- Day 3: open IP scaffold PR; start prior-art table; schedule red-team on policy pack.



---

# 13) Initial File Drops (copy-ready)
Below are minimal-but-runnable skeletons you can paste into the repo to unblock workstreams immediately.

## `/spec/prov-contracts.md` (v0)
```markdown
# Prov‑Contracts (v0)

**Goal:** Compile policy+consent+lineage into an executable contract evaluated on every action; emit verifiable evidence bundles.

## Contract Object
```yaml
contract_id: pc_2025_10_v0
purpose: customer_support
scope:
  datasets: [customers, tickets, interactions]
  fields:
    include: [name, email_hash, ticket_text]
    exclude: [ssn, raw_email]
consent:
  required: [marketing_opt_in=false, gdpr_basis=contract]
obligations:
  - redact: patterns: [EMAIL, PHONE]
  - log_evidence: level: standard
attestations:
  - signer: service/prov-ledger@cluster-a
    algo: ed25519
```

## Evidence Bundle (summary)
- `action`: verb/object, actor, timestamp, hash inputs/outputs
- `policy_eval`: decision, rules fired, evidence
- `attestation`: signature chain
- `lineage`: dataset + version ids

## Verification Budget
- Verify <10ms median; <1ms per signature (batched)
```

## `/spec/evidence.schema.json` (v0)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/evidence.json",
  "title": "Evidence Bundle",
  "type": "object",
  "required": ["id", "action", "policy_eval", "attestations", "hashes"],
  "properties": {
    "id": {"type": "string"},
    "ts": {"type": "string", "format": "date-time"},
    "action": {
      "type": "object",
      "required": ["actor", "verb", "object"],
      "properties": {
        "actor": {"type": "string"},
        "verb": {"type": "string"},
        "object": {"type": "string"}
      }
    },
    "hashes": {
      "type": "object",
      "properties": {
        "input": {"type": "string"},
        "output": {"type": "string"}
      }
    },
    "policy_eval": {
      "type": "object",
      "required": ["decision", "rules"],
      "properties": {
        "contract_id": {"type": "string"},
        "decision": {"type": "string", "enum": ["allow", "deny"]},
        "rules": {"type": "array", "items": {"type": "string"}},
        "explanations": {"type": "array", "items": {"type": "string"}}
      }
    },
    "attestations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["signer", "algo", "sig"],
        "properties": {
          "signer": {"type": "string"},
          "algo": {"type": "string"},
          "sig": {"type": "string"}
        }
      }
    }
  }
}
```

## `services/prov-ledger/app.py`
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import hashlib, json, os

app = FastAPI(title="prov-ledger")
DATA = {}

class Evidence(BaseModel):
    id: str
    ts: str
    action: dict
    hashes: dict
    policy_eval: dict
    attestations: list

@app.post("/evidence")
def put_evidence(ev: Evidence):
    # simple WORM check
    if ev.id in DATA:
        raise HTTPException(409, "exists")
    DATA[ev.id] = ev.model_dump()
    return {"ok": True, "id": ev.id}

@app.get("/evidence/{eid}")
def get_evidence(eid: str):
    ev = DATA.get(eid)
    if not ev:
        raise HTTPException(404, "not found")
    return ev

@app.get("/verify/{eid}")
def verify(eid: str):
    ev = DATA.get(eid)
    if not ev:
        raise HTTPException(404)
    # toy verification: recompute content hash
    payload = json.dumps({k: ev[k] for k in ["action","hashes","policy_eval"]}, sort_keys=True).encode()
    content_hash = hashlib.sha256(payload).hexdigest()
    ok = content_hash == ev["hashes"].get("input")
    return {"ok": ok, "content_hash": content_hash}
```

## `tools/provenance/emit.py`
```python
import json, sys, time, uuid, hashlib
from datetime import datetime

def mk_evidence(actor: str, verb: str, obj: str, payload: dict):
    h = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    eid = f"ev_{uuid.uuid4().hex[:12]}"
    return {
        "id": eid,
        "ts": datetime.utcnow().isoformat()+"Z",
        "action": {"actor": actor, "verb": verb, "object": obj},
        "hashes": {"input": h, "output": ""},
        "policy_eval": {"contract_id": "pc_2025_10_v0", "decision": "allow", "rules": ["consent.ok"], "explanations": []},
        "attestations": [{"signer": "service/prov-ledger@local", "algo": "ed25519", "sig": "TODO"}]
    }

if __name__ == "__main__":
    ev = mk_evidence("svc.demo","read","customers",{"n":1})
    print(json.dumps(ev))
```

## `prov/verify/__main__.py` (CLI)
```python
import json, sys, pathlib, hashlib

def verify_dir(p: pathlib.Path) -> int:
    ok_all = True
    for f in p.glob("*.json"):
        ev = json.loads(f.read_text())
        payload = json.dumps({k: ev[k] for k in ["action","hashes","policy_eval"]}, sort_keys=True).encode()
        if hashlib.sha256(payload).hexdigest() != ev.get("hashes",{}).get("input"):
            ok_all = False
            print(f"FAIL {f}")
    print("OK" if ok_all else "FAIL")
    return 0 if ok_all else 1

if __name__ == "__main__":
    d = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "./evidence")
    raise SystemExit(verify_dir(d))
```

## `services/er-service/app.py` (bitemporal skeleton)
```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

app = FastAPI(title="er-service")

class Entity(BaseModel):
    id: str
    attrs: dict
    valid_from: datetime
    valid_to: Optional[datetime] = None
    txn_time: datetime

DB = {"entities": []}

@app.post("/upsert")
def upsert(e: Entity):
    DB["entities"].append(e.model_dump())
    return {"ok": True}

@app.get("/resolve/{eid}")
def resolve(eid: str, asof: Optional[datetime] = None):
    rows = [r for r in DB["entities"] if r["id"]==eid]
    if asof:
        rows = [r for r in rows if r["valid_from"] <= asof and (r["valid_to"] is None or r["valid_to"]>=asof)]
    rows.sort(key=lambda r: r["txn_time"], reverse=True)
    return rows[:1]
```

## `policy/contracts.rego` (sample)
```rego
package contracts

default allow = false

allow {
  input.contract.purpose == "customer_support"
  not contains(input.object, "ssn")
  consent_ok
}

consent_ok { input.consent.gdpr_basis == "contract" }
```

## `conductor-ui/README.md` (tri‑pane shell)
```markdown
# Conductor UI

Layout:
- Left: Action Ledger (evidence stream)
- Middle: Workbench (tasks, NL→Cypher editor, results)
- Right: Inspectors (policy eval, provenance, performance)

MVP: Vite + React + Tailwind; ws feed from prov-ledger; badge states for allow/deny.
```

## `observability/metrics_contract.md`
```markdown
# Metrics Contract
- http_server_request_duration_seconds: histogram (p50,p95,p99)
- evidence_verify_seconds: histogram
- slo_violations_total: counter
- cache_hit_ratio: gauge
- cost_per_1k_ops: gauge
```

---

# 14) Day 4–7 Kanban
- [ ] Wire `prov-ledger` into Conductor UI (WS feed)
- [ ] NL→Cypher compiler stub + tests (scope pruning)
- [ ] ER adjudication queue + explain overlay
- [ ] Policy‑fuzzer seeds for consent edge‑cases
- [ ] Perf harness: baseline p95/p99; set SLOs
- [ ] IP: claims outline + figure list



---

# 15) Experiments Harness (+ configs)

## `/experiments/eval_harness.py`
```python
import json, time, uuid, pathlib
from statistics import mean
from typing import List, Dict

class Timer:
    def __enter__(self):
        import time
        self.t0 = time.perf_counter(); return self
    def __exit__(self, *exc):
        import time
        self.dt = time.perf_counter() - self.t0

def p(vals: List[float], q: float) -> float:
    vals = sorted(vals)
    k = max(0, min(len(vals)-1, int(q * (len(vals)-1))))
    return vals[k]

def run_latency_probe(url: str, n: int = 100) -> Dict:
    import requests
    lat = []
    for i in range(n):
        with Timer() as t:
            requests.get(f"{url}/healthz")
        lat.append(t.dt)
    return {"p50": p(lat,0.50), "p95": p(lat,0.95), "p99": p(lat,0.99)}

def main():
    cfg = json.loads(pathlib.Path("experiments/configs/default.json").read_text())
    prov = run_latency_probe(cfg["prov_ledger_url"], n=cfg["latency_probes"]) 
    res = {"prov_ledger": prov, "ts": time.time(), "run_id": uuid.uuid4().hex}
    out = pathlib.Path("experiments/outputs"); out.mkdir(parents=True, exist_ok=True)
    (out/"latency.json").write_text(json.dumps(res, indent=2))
    print(json.dumps(res))

if __name__ == "__main__":
    main()
```

## `/experiments/configs/default.json`
```json
{
  "prov_ledger_url": "http://localhost:8000",
  "latency_probes": 64
}
```

## `/experiments/run.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
python3 -m experiments.eval_harness
```

---

# 16) Benchmark & KPIs Pack

## `/benchmark/kpis.md`
```markdown
# KPIs
- p95 latency (prov-ledger verify) < 150ms
- evidence verification median < 10ms
- policy coverage ≥ 80%
- NL→Cypher exact-match ≥ 85%
- SLO violations: 0 in staging for 7d prior to GA
```

## `/benchmark/baselines.md`
```markdown
# Baselines
Describe current metrics (fill after first run):
- p50/p95/p99 (prov-ledger /healthz)
- ingest throughput (evidence/sec)
- ER resolve latency
```

## `/benchmark/datasets.md`
```markdown
# Datasets
- Synthetic PII graph (10k entities, 3x duplicates)
- Load traces (RPS 1–100, bursty)
- Policy suites (consent true/false; purpose mismatch)
```

---

# 17) IP Scaffold

## `/ip/draft_spec.md`
```markdown
# Title
Prov‑Contracts with Bitemporal Adjudication and Evidence‑Bound LLM I/O

## Field
Data governance, security, ML systems, graph databases.

## Background
(briefly note: OPA/Rego, Zanzibar, SLSA, GraphRAG) and their limitations (no unified runtime data‑use provenance; weak purpose/consent binding; lack of bitemporal adjudication).

## Summary
The invention compiles policy+consent+lineage into executable *prov‑contracts* that gate actions and produce verifiable evidence bundles. A bitemporal ER service generates adjudication with explanations. LLM I/O is scope‑aware and ships with proof bundles.

## Drawings
Fig.1 System overview; Fig.2 Contract compilation pipeline; Fig.3 Evidence bundle; Fig.4 Bitemporal index; Fig.5 Policy‑fuzzer flow.

## Detailed Description
- Contracts, compiler, runtime hooks
- Evidence schema & signing
- Bitemporal ER structures; valid‑time/txn‑time
- NL→Cypher scope pruning; GraphRAG binding
- Observability & Cost Guard

## Industrial Applicability
Regulatory compliance; audit; data platforms; enterprise SaaS.
```

## `/ip/claims.md`
```markdown
### Independent Claim 1 (Method)
Compiling a policy‑consent‑lineage specification into an executable contract that (i) intercepts actions, (ii) evaluates scope and purpose, (iii) emits a signed evidence bundle linking inputs/outputs, and (iv) enforces allow/deny with explanations.

### Independent Claim 2 (System)
A system comprising: (a) a bitemporal entity service with valid‑time and transaction‑time indices; (b) a provenance ledger producing hash‑chained records; (c) a policy compiler; (d) an LLM I/O binder that attaches evidence bundles to responses.

### Dependent Claims (examples)
1. Consent revision propagation across prior evidence.
2. RL‑constrained autoscaling with invariant guards.
3. Proof bundling with batched signatures.
4. Scope‑aware NL→Cypher pruning.
5. Policy‑fuzzer guided by lineage coverage.
6. Cache tiering with provenance preservation.
7. Unified SLSA build + runtime data‑use provenance.
8. Redaction obligations with detector attestations.
```

## `/ip/prior_art.csv`
```csv
citation,artifact_link,license,claim_summary,technical_deltas,attack_surface
"OPA/Rego","","Apache-2.0","Policy evaluation engine","Add consent/purpose; compile into runtime prov‑contracts; evidence bundling","Rule bypass, mis‑scoping"
"Zanzibar/SpiceDB","","Apache-2.0","AuthZ tuples at scale","Add bitemporal edges; evidence binding to decisions","Staleness, retroactive consent"
"SLSA","","Apache-2.0","Supply chain provenance","Unify with runtime data‑use provenance","Attestation drift"
"GraphRAG","","Varies","LLM over graphs","Scope‑aware compilation + proofs","Hallucination, ungrounded cites"
```

## `/ip/fto.md`
```markdown
# FTO Notes
- Avoid GPL/AGPL deps; prefer Apache‑2.0/BSD/MIT.
- Distinguish runtime data‑use provenance from build provenance to steer clear of SLSA narrow claims.
- Emphasize *purpose/consent binding* + bitemporal adjudication as novel axes.
```

---

# 18) Compliance Pack

## `/compliance/data-governance.md`
```markdown
# Data Governance
- PII detectors & redactors on ingest paths
- Consent scopes required for access
- Evidence bundles retained WORM 7y (configurable)
- DPIA templates included; default retention policy 90d for raw logs
```

## `/compliance/SPDX.SBOM.json`
```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "summit",
  "documentNamespace": "spdx:summit:proto",
  "creationInfo": {"creators": ["Tool: sbom-bootstrap"], "created": "2025-09-30T00:00:00Z"},
  "packages": []
}
```

---

# 19) Commercial Brief

## `/go/brief.md`
```markdown
# Commercialization Brief
**Licensable Units:** Prov‑contract compiler, Prov‑ledger, Cost Guard, Policy Fuzzer, IntelGraph bitemporal module, Conductor UI kit.
**Targets:** Regulated SaaS, Fin/Health, Gov/Defense, Data platforms.
**Pricing:** per‑core (runtime), per‑action (evidence), per‑cluster (guard), OEM for DB vendors.
**GTM:** security/compliance champions; proof‑of‑evidence demos; p95/$ benchmarks.
**Partners:** cloud marketplaces, graph DB vendors, SI partners.
```

---

# 20) Release Notes Template

## `/integration/release-notes.md`
```markdown
# Release <vX.Y.Z>
- Features
- Fixes
- Perf/Cost
- Compliance/IP updates
- Evidence schema changes (migration notes)
```



---

# 21) NL→Cypher Compiler (scope‑aware) — Skeleton + Tests

## `services/nl2cypher/compiler.py`
```python
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import re

@dataclass
class ContractScope:
    purpose: str
    datasets: List[str]
    include_fields: List[str]
    exclude_fields: List[str]

    def field_allowed(self, f: str) -> bool:
        if f in self.exclude_fields:
            return False
        return (not self.include_fields) or (f in self.include_fields)

TEMPLATES: Dict[str, str] = {
    # name := tickets, status := open/closed
    "count_tickets_by_status": "MATCH (t:Ticket {status: $status}) RETURN count(t) AS n",
    # email_hash scoped
    "get_customer_by_email_hash": "MATCH (c:Customer {email_hash: $email_hash}) RETURN c LIMIT 1",
    # tickets for a customer
    "tickets_for_customer": "MATCH (c:Customer {id: $cid})-[:FILED]->(t:Ticket) RETURN t ORDER BY t.created_at DESC LIMIT $limit"
}

INTENT_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"count (?:all )?tickets (?:that are )?(?P<status>open|closed)", re.I), "count_tickets_by_status"),
    (re.compile(r"customer by email(?: hash)? (?P<email_hash>[a-f0-9]{32,64})", re.I), "get_customer_by_email_hash"),
    (re.compile(r"tickets for customer (?P<cid>[A-Za-z0-9_-]+)", re.I), "tickets_for_customer"),
]

class NL2CypherError(Exception):
    pass

class NL2CypherCompiler:
    def __init__(self, scope: ContractScope):
        self.scope = scope

    def _check_scope(self, intent: str, params: Dict[str, str]):
        # dataset gating
        if intent in ("count_tickets_by_status", "tickets_for_customer") and "tickets" not in self.scope.datasets:
            raise NL2CypherError("dataset 'tickets' not allowed by scope")
        if intent == "get_customer_by_email_hash" and "customers" not in self.scope.datasets:
            raise NL2CypherError("dataset 'customers' not allowed by scope")
        # field gating
        for k in list(params.keys()):
            if not self.scope.field_allowed(k):
                raise NL2CypherError(f"field '{k}' not allowed by scope")

    def compile(self, text: str) -> Tuple[str, Dict[str, str], str]:
        for pat, intent in INTENT_PATTERNS:
            m = pat.search(text)
            if not m:
                continue
            params = {k: v for k, v in m.groupdict().items() if v is not None}
            # defaults
            if intent == "tickets_for_customer":
                params.setdefault("limit", 50)
            self._check_scope(intent, params)
            cy = TEMPLATES[intent]
            return cy, params, intent
        raise NL2CypherError("no intent matched")
```

## `services/nl2cypher/__init__.py`
```python
from .compiler import NL2CypherCompiler, ContractScope, NL2CypherError
```

## `services/nl2cypher/app.py`
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .compiler import NL2CypherCompiler, ContractScope, NL2CypherError

app = FastAPI(title="nl2cypher")

class CompileReq(BaseModel):
    text: str
    scope: dict

@app.post("/compile")
def compile(req: CompileReq):
    sc = ContractScope(
        purpose=req.scope.get("purpose",""),
        datasets=req.scope.get("datasets",[]),
        include_fields=req.scope.get("fields",{}).get("include",[]),
        exclude_fields=req.scope.get("fields",{}).get("exclude",[]),
    )
    comp = NL2CypherCompiler(sc)
    try:
        cy, params, intent = comp.compile(req.text)
        return {"cypher": cy, "params": params, "intent": intent}
    except NL2CypherError as e:
        raise HTTPException(400, str(e))
```

## `tests/test_nl2cypher.py`
```python
import pytest
from services.nl2cypher import NL2CypherCompiler, ContractScope, NL2CypherError

SCOPE = ContractScope(
    purpose="customer_support",
    datasets=["tickets","customers"],
    include_fields=["status","email_hash","cid","limit"],
    exclude_fields=["ssn","raw_email"]
)

@pytest.mark.parametrize("q, intent", [
    ("count tickets that are open", "count_tickets_by_status"),
    ("customer by email hash 0f1e2d3c4b5a6978cafedeadbeef0000", "get_customer_by_email_hash"),
    ("tickets for customer C123", "tickets_for_customer"),
])
def test_compile(q, intent):
    c = NL2CypherCompiler(SCOPE)
    cy, params, got = c.compile(q)
    assert got == intent
    assert isinstance(cy, str)

def test_scope_violation_dataset():
    sc = ContractScope("customer_support", ["tickets"], ["status"], [])
    c = NL2CypherCompiler(sc)
    with pytest.raises(NL2CypherError):
        c.compile("customer by email hash deadbeefdeadbeefdeadbeefdeadbeef")

def test_scope_violation_field():
    sc = ContractScope("customer_support", ["customers"], ["cid"], ["email_hash"])
    c = NL2CypherCompiler(sc)
    with pytest.raises(NL2CypherError):
        c.compile("customer by email hash deadbeefdeadbeefdeadbeefdeadbeef")
```

---

# 22) Cost Guard — Safe RL Controller Skeleton

## `services/cost-guard/service.py`
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class Decision(str, Enum):
    ADMIT = "admit"
    THROTTLE = "throttle"
    DEFER = "defer"
    SCALE = "scale"

class Metrics(BaseModel):
    rps: float = 0.0
    p95_ms: float = 0.0
    error_rate: float = 0.0
    cost_per_1k: float = 0.0

class Policy(BaseModel):
    budget_per_day: float
    p95_target_ms: float = 150
    max_scale_rate: float = 2.0
    min_replicas: int = 1
    max_replicas: int = 50
    shadow: bool = True

class State(BaseModel):
    replicas: int = 1
    spend_today: float = 0.0

class DecideReq(BaseModel):
    metrics: Metrics
    policy: Policy
    state: State

class DecideResp(BaseModel):
    decision: Decision
    target_replicas: int
    shadow_only: bool = True
    reason: str

app = FastAPI(title="cost-guard")


def safe_envelope(req: DecideReq) -> DecideResp:
    m, p, s = req.metrics, req.policy, req.state

    # Hard invariants (never violate)
    if s.spend_today > p.budget_per_day:
        return DecideResp(decision=Decision.THROTTLE, target_replicas=max(p.min_replicas, s.replicas//2 or 1), shadow_only=p.shadow, reason="budget exceeded")
    if m.p95_ms > (p.p95_target_ms * 2):  # severe latency
        return DecideResp(decision=Decision.SCALE, target_replicas=min(p.max_replicas, int(s.replicas * 1.5) or (s.replicas+1)), shadow_only=p.shadow, reason="p95 severe")

    # Heuristic baseline (placeholder for RL)
    target = s.replicas
    if m.p95_ms > p.p95_target_ms * 1.2:
        target = min(p.max_replicas, s.replicas + 1)
        action = Decision.SCALE
        reason = "p95 above target"
    elif m.error_rate > 0.02:
        action = Decision.DEFER
        reason = "error rate high"
    elif m.cost_per_1k > 0 and m.cost_per_1k > 0.9 * (p.budget_per_day / 1000):
        action = Decision.THROTTLE
        reason = "approaching unit cost budget"
    else:
        action = Decision.ADMIT
        reason = "within SLO & budget"

    # Scale-rate limiter
    max_delta = max(1, int(s.replicas * (p.max_scale_rate - 1)))
    if action == Decision.SCALE:
        target = min(target, s.replicas + max_delta)

    # Respect bounds
    target = max(p.min_replicas, min(p.max_replicas, target))

    return DecideResp(decision=action, target_replicas=target, shadow_only=p.shadow, reason=reason)

@app.post("/decide", response_model=DecideResp)
def decide(req: DecideReq):
    return safe_envelope(req)

@app.get("/healthz")
def health():
    return {"ok": True}
```

## `services/cost-guard/config.yaml`
```yaml
budget_per_day: 150.0
p95_target_ms: 150
max_scale_rate: 1.5
min_replicas: 2
max_replicas: 20
shadow: true
```

## `tests/test_cost_guard.py`
```python
from services.cost_guard.service import DecideReq, Metrics, Policy, State, safe_envelope, Decision

BASE = DecideReq(metrics=Metrics(rps=50,p95_ms=140,error_rate=0.0,cost_per_1k=5.0),
                 policy=Policy(budget_per_day=200.0,p95_target_ms=150),
                 state=State(replicas=4,spend_today=50.0))

def test_admit():
    resp = safe_envelope(BASE)
    assert resp.decision in (Decision.ADMIT, Decision.SCALE)

def test_budget_exceeded():
    req = BASE.model_copy()
    req.state.spend_today = 999
    resp = safe_envelope(req)
    assert resp.decision == Decision.THROTTLE

def test_severe_latency_scales():
    req = BASE.model_copy()
    req.metrics.p95_ms = 400
    resp = safe_envelope(req)
    assert resp.decision == Decision.SCALE
    assert resp.target_replicas >= BASE.state.replicas
```

## `README (services/cost-guard/README.md)`
```markdown
# Cost Guard
Safe controller for admission, throttling, deferral, and scaling under SLO+budget invariants. Supports shadow mode.

### API
POST /decide → {decision, target_replicas, shadow_only, reason}

### Invariants
- Never exceed daily budget → throttle
- Severe p95 → scale with rate‑limit
- Respect min/max replicas, max scale rate

### RL Hook
Replace `safe_envelope` heuristic with a policy that is trained offline; guard with the same invariants.
```

---

# 23) Wiring Notes
- Conductor calls `nl2cypher` first with the active contract scope; failures are surfaced inline (reason).
- Successful compile emits a *pre‑evidence* stub (intent, params) before executing against IntelGraph.
- After query, Conductor requests `cost-guard/decide` with live metrics; if `shadow_only=true`, apply decision to **shadow HPA** and log deltas; otherwise actuate.
- Evidence bundles include the intent, compiled query hash, and the cost‑guard decision.

