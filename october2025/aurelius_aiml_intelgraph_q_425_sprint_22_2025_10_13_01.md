# AURELIUS — AI/ML Workstream Review & Next Sprint Plan

**Workstream:** IntelGraph — AI/ML Research & Engineering  
**Cadence Alignment:** Q4’25, Sprint 22 (2025‑10‑13 → 2025‑10‑24, 10 business days), synched with MC & Switchboard sprints  
**Author:** AURELIUS (Summit & Topicality’s AI Scientist/Researcher/Engineer)  
**Version:** v1.0 (2025‑09‑30, America/Denver)

---

## 1) Executive Summary (≤250 words)

We reviewed the repo and active sprints (IntelGraph, Maestro Conductor, Switchboard). The stack is strong on product orchestration, OPA‑guarded governance, and UI flow, but has **gaps in AI/ML evaluation, provenance, and patent‑grade enablement**. Specifically: no unified **eval harness** with deterministic seeds; missing **benchmark datasets & ablations**; incomplete **cost/latency telemetry** for NL→Cypher and GDS analytics; partial **provenance/SBOM/SLSA** integration across all components; and no consolidated **IP/prior‑art ledger**.

This sprint ships an **Auditable Intelligence Core** upgrade: a reproducible eval harness, policy‑aware NL→Cypher pipeline with cost guards, graph‑ops explainability, provenance decorators, SLSA/SBOM plumbing, and an IP scaffold with claims + prior‑art table. We target measurable deltas: **p95 NL→Cypher < 1.2s; p95 graph ops < 1.0s** on demo corpus; **cost/query reduced ≥15%** via query shaping; **coverage metrics** for test graphs; and **attested build artifacts**. Outputs land as a clean, green, runnable **Repro Pack** with CI.

**Business impact:** faster, cheaper, safer insights with compliance‑ready receipts and patentable surface area (protocols, curricula, provenance, evals). This strengthens enterprise sales, due diligence, and licensing.

---

## 2) In‑Depth Review & Gap Analysis

### What’s strong

- **Governance & cadence:** Clear sprint scaffolds; OPA policies curated; canary/rollback guardrails defined.
- **Switchboard skeleton:** Tauri + Next.js app with CI, policy formatting/tests.
- **MC attestation intent:** A GitHub workflow for verifying attestations exists.

### Gaps in our ambit (AI/ML R&D)

- **Eval & Benchmarks**: No unified `/experiments` or `/benchmark` harness; sparse ablation planning; missing dataset/eval cards.
- **Determinism & Telemetry**: Seeds, metrics, and run provenance not consistently captured (lack of JSONL traces).
- **NL→Cypher Pipeline**: Cost/latency shaping and explanation are described but not implemented end‑to‑end; no query plan previews.
- **Graph Analytics XAI**: GDS results lack rationale bindings + exportable receipts.
- **Provenance & Compliance**: SBOM/SLSA/cosign not wired for all components (Switchboard has CI but no SBOM; IG/MC CI missing unified provenance).
- **IP Discipline**: No central prior‑art CSV, claims drafts, or FTO notes; inventorship and change logs unlinked to runs.
- **Coverage**: No coverage metrics for graph query classes, policy paths, or NL intents.

### Quick wins

- Ship a **minimal, deterministic eval harness** (Python) with JSONL run logs + seed control.
- Add **provenance decorators** to NL→Cypher and GDS outputs; emit receipts (source, license, authority, policy decisions).
- Wire **SBOM + SLSA provenance** to CI across repos; cosign/verify on PR and release.
- Stand up **/ip** scaffold: claims, prior‑art CSV, FTO notes.

---

## 3) Next Sprint (2025‑10‑13 → 2025‑10‑24)

### Objectives & DoD

- **O1 — Reproducible Eval Harness**: Deterministic seeds; metrics (latency, cost, accuracy against golden Cypher); JSONL traces; CLI & CI.  
  **DoD:** `make test` green; eval run artifacts in `/artifacts/runs/` with schema‑validated JSONL; coverage report.
- **O2 — NL→Cypher with Receipts**: Cost estimator + query shaping; explanation previews; OPA policy check with appeal hooks.  
  **DoD:** p95 NL→Cypher <1.2s; cost deltas reported; blocked actions show policy evidence.
- **O3 — GDS Explainability & Receipts**: Centrality/communities with per‑result provenance and rationale.  
  **DoD:** Exports include lineage + method params; p95 graph ops <1.0s.
- **O4 — Provenance‑First CI**: SBOM (Syft) + SLSA provenance + cosign across components.  
  **DoD:** GitHub Actions produce artifacts + attestations; verification job passes.
- **O5 — IP & Compliance Pack**: Claims draft; prior‑art CSV; FTO memo; SPDX/SBOM inventory; data governance notes.  
  **DoD:** `/ip` complete; CI check for inventory present.

### Sprint Backlog (Stories)

- **S1 (XL)** Eval harness core (`/experiments`, `/benchmark`) with dataset/eval cards, ablations plan, unit‑economics metrics.
- **S2 (L)** NL→Cypher **cost model** + **plan preview** + **policy gate**.
- **S3 (M)** GDS receipts: emit `provenance.json` with params, inputs, and hashes; attach to exports.
- **S4 (M)** Coverage metrics (intent classes, policy paths, graph‑query templates) + report.
- **S5 (M)** CI: SBOM + SLSA + cosign release; verify workflow; release notes.
- **S6 (S)** IP scaffold: `claims.md`, `prior_art.csv`, `fto.md`; inventorship log conventions.
- **S7 (S)** Docs: dataset card, eval card, operator playbook additions.

### Milestones

- **M1:** Eval harness MVP (D3)
- **M2:** NL→Cypher cost‑shaping + receipts (D5)
- **M3:** GDS receipts + coverage (D7)
- **M4:** Provenance CI + IP pack (D9)
- **M5:** Demo + canary criteria (D10)

---

## 4) Repro Pack Tree (ready‑to‑run)

```
/design/
  problem.md
  novelty_matrix.md
/spec/
  method_spec.md
  interfaces.md
  pseudocode.md
/impl/
  aurelius_core/
    __init__.py
    receipts.py
    nl2cypher.py
    cost_model.py
    gds_receipts.py
    telemetry.py
  cli/
    ig_eval.py
    ig_receipts_demo.py
  tests/
    test_cost_model.py
    test_receipts.py
/experiments/
  configs/
    small_demo.yaml
    ablation.yaml
  datasets/
    demo_graph/  # synthetic with license metadata
  runs/  # JSONL outputs
/benchmark/
  kpis.md
  baselines.md
  metrics_schema.json
/ip/
  draft_spec.md
  claims.md
  prior_art.csv
  fto.md
/compliance/
  LICENSES/
  SBOM/  # generated by CI
  SLSA/
/integration/
  gh_actions/
    ci.yml
    release.verify.yml
  sdk_stubs.md
```

---

## 5) Method Spec (excerpt)

### 5.1 NL→Cypher Cost Model & Plan Preview

**Idea:** Before executing a generated Cypher, estimate cost by **pattern‑shaping** (node/edge selectivity, index usage, neighborhood radius). Reject or rewrite if cost exceeds budget; surface a preview with **OPA policy** explanation.

- Input: natural language `q`, graph schema stats, intent class, user policy context.
- Output: `{cypher, cost_estimate_ms, plan_features, policy_check: pass|block, explanation}`.

**Complexity:** O(|nodes| + |edges|) feature extraction per query; constant‑time policy check (OPA eval) given compiled bundle.

### 5.2 GDS Receipts

Attach a JSON receipt to each analytics result with: algorithm name & version, params, input subgraph hash, runtime, policy labels, and licensing tags. Export receipts with data products.

---

## 6) Reference Implementation (clean‑room)

> Python 3.11; deterministic seeds; no GPL/AGPL deps. Below are core modules (abridged).

### 6.1 `aurelius_core/receipts.py`

```python
from __future__ import annotations
import hashlib, json, time, uuid
from dataclasses import dataclass, asdict

@dataclass
class Receipt:
    kind: str
    version: str
    inputs: dict
    params: dict
    outputs: dict | None
    started_at: float
    ended_at: float
    policy: dict
    license: dict
    run_id: str

    def to_json(self) -> str:
        d = asdict(self)
        d["inputs_hash"] = hashlib.sha256(json.dumps(self.inputs, sort_keys=True).encode()).hexdigest()
        d["params_hash"] = hashlib.sha256(json.dumps(self.params, sort_keys=True).encode()).hexdigest()
        return json.dumps(d, sort_keys=True)

class ReceiptBuilder:
    def __init__(self, kind: str, version: str, policy: dict, license: dict):
        self.kind, self.version, self.policy, self.license = kind, version, policy, license
        self.run_id = str(uuid.uuid4())
        self.t0 = time.time()
        self.inputs, self.params, self.outputs = {}, {}, None

    def with_inputs(self, **kw):
        self.inputs.update(kw); return self
    def with_params(self, **kw):
        self.params.update(kw); return self
    def with_outputs(self, **kw):
        self.outputs = kw; return self
    def build(self) -> Receipt:
        return Receipt(self.kind, self.version, self.inputs, self.params, self.outputs, self.t0, time.time(), self.policy, self.license, self.run_id)
```

### 6.2 `aurelius_core/cost_model.py`

```python
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class PlanFeatures:
    node_est: int
    edge_est: int
    radius: int
    has_index: bool

@dataclass
class CostEstimate:
    ms: float
    reason: str

class NL2CypherCostModel:
    def estimate(self, f: PlanFeatures) -> CostEstimate:
        base = 0.2 * f.node_est + 0.05 * f.edge_est + 1.5 * f.radius
        if not f.has_index:
            base *= 1.8
        return CostEstimate(ms=max(5.0, base), reason=("no-index" if not f.has_index else "ok"))
```

### 6.3 `aurelius_core/nl2cypher.py` (preview + policy gate)

```python
from __future__ import annotations
from dataclasses import dataclass
from .cost_model import NL2CypherCostModel, PlanFeatures

@dataclass
class NLQuery:
    text: str
    intent: str

class NL2Cypher:
    def __init__(self, policy_eval):
        self.cost = NL2CypherCostModel(); self.policy_eval = policy_eval

    def plan_features(self, q: NLQuery, schema_stats: dict) -> PlanFeatures:
        # toy heuristics; replace with learned model features
        idx = schema_stats.get("has_index", True)
        return PlanFeatures(node_est=schema_stats.get("node_est", 5_000), edge_est=schema_stats.get("edge_est", 20_000), radius=2 if q.intent=="neighborhood" else 1, has_index=idx)

    def generate(self, q: NLQuery) -> str:
        # placeholder; swap with model inference
        return f"MATCH (n)-[r]->(m) WHERE n.name CONTAINS '{q.text.split()[0]}' RETURN n,m LIMIT 100"

    def preview(self, q: NLQuery, schema_stats: dict, user_ctx: dict):
        feats = self.plan_features(q, schema_stats)
        est = self.cost.estimate(feats)
        cypher = self.generate(q)
        pol = self.policy_eval({"intent": q.intent, "estimated_ms": est.ms, "user": user_ctx})
        return {"cypher": cypher, "features": feats.__dict__, "estimate_ms": est.ms, "policy": pol}
```

### 6.4 `aurelius_core/telemetry.py` (JSONL runs)

```python
import json, time, pathlib, random

def set_seeds(seed: int):
    random.seed(seed)

class RunLogger:
    def __init__(self, outdir: str):
        self.path = pathlib.Path(outdir); self.path.mkdir(parents=True, exist_ok=True)
    def log(self, record: dict):
        record["ts"] = time.time()
        with (self.path/"runs.jsonl").open("a") as f:
            f.write(json.dumps(record, sort_keys=True) + "\n")
```

---

## 7) CI & Compliance (GitHub Actions snippets)

### 7.1 Unified CI (`/integration/gh_actions/ci.yml`)

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test-and-sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -U pip && pip install -e ./impl -r requirements.txt
      - run: pytest -q
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with: { path: '.', format: 'spdx-json', output-file: 'sbom.json' }
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.json }
  provenance:
    needs: [test-and-sbom]
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: write }
    steps:
      - uses: actions/checkout@v4
      - name: SLSA provenance
        uses: slsa-framework/slsa-github-generator/actions/create-slsa3-provenance@v2
        with: { artifact_path: 'sbom.json' }
```

### 7.2 Attestation Verification (`/integration/gh_actions/release.verify.yml`)

```yaml
name: release.verify
on: { workflow_dispatch: {} }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify attestation
        uses: sigstore/cosign-installer@v3
      - run: |
          cosign verify-attestation --type slsaprovenance --certificate-oidc-issuer-regexp 'https://github.com/login/oauth' \
            --certificate-identity-regexp 'https://github.com/.+/.+/.github/workflows/.+@.+' ghcr.io/org/app:tag
```

---

## 8) Benchmarks & Experiments

### KPIs

- **Latency:** p50/p95 NL→Cypher, graph ops; **Cost/query**; **Throughput/Watt** (if measured); **Coverage** (intent & policy paths).
- **Quality:** Exact‑match/functional success of Cypher against goldens; error taxonomies; policy denial accuracy.
- **Reliability:** Flake rate; determinism (seed‑repeatable within ±1%).

### Datasets

- **`demo_graph` (synthetic)** with license tags and controlled schema stats.

### Ablations

- Cost model variants (with/without index; varying radius), query templates vs learned generation, policy gating strategies.

### Eval Harness CLI

```bash
python -m impl.cli.ig_eval \
  --dataset experiments/datasets/demo_graph \
  --runs experiments/runs --seed 42 --budget_ms 1200
```

---

## 9) IP Pack

### /ip/draft_spec.md (scaffold)

- **Title:** Policy‑Aware NL→Graph Query Preview with Provenance Receipts
- **Field:** AI‑assisted data analytics; graph databases; governance.
- **Background:** NL→SQL/Cypher; OPA policy gates; SLSA provenance — limitations: lack of cost‑aware previews with integrated policy receipts.
- **Summary:** A pipeline that **estimates cost & policy risk before execution**, emits **provenance receipts** attached to results, and **optimizes** query plans under budget + policy.
- **Drawings:** Flowchart (NL → preview → policy check → execute/appeal), receipt schema, CI provenance chain.
- **Detailed Description:** Embodiments for graph DBs (Neo4j, Memgraph), SQL variants, batch & streaming.
- **Claims:** see `claims.md`.
- **Industrial Applicability:** enterprise analytics with compliance.
- **Enablement/Best Mode:** reference impl + configs.
- **FTO:** prior‑art table + design‑arounds.

### /ip/claims.md (seed)

1. **Method**: receiving NL query; generating candidate graph query; extracting plan features; **estimating cost**; **policy‑evaluating** pre‑execution; rendering preview with rationale; executing only if within budget/policy; emitting **provenance receipt** linking inputs, params, and outputs.
2. **System/CRM**: non‑transitory medium storing instructions to perform claim 1 across clients/servers with attested build pipeline.
   3–10. **Dependent**: features for selectivity stats; index awareness; variable radius; OPA bundle integration; appeal workflow; receipt schema with hashes; SBOM/SLSA attestation linkage; coverage metrics; learned cost estimator; mobile/edge runtime mapping.

### /ip/prior_art.csv (seed columns)

`citation, artifact_link, license, claim_summary, technical_deltas, attack_surface`

### /ip/fto.md

- Potential overlaps: NL→SQL previews; DB cost estimates; OPA policy gates — mitigate via **integrated policy‑receipt coupling** and **graph‑specific cost shaping**.

---

## 10) Commercial Brief (/go/brief.md)

- **Licensable Units:** Eval harness SDK; receipts runtime; NL→Graph preview engine; provenance CI toolkit.
- **Targets:** Regulated analytics (finserv, healthcare, gov), data platforms (Neo4j/Memgraph), SI partners.
- **Pricing:** Per‑seat (analyst), per‑query (SaaS), OEM royalty (SDK).
- **GTM Hooks:** Compliance wins (SBOM/SLSA; export receipts), ROI (cost/query ↓, analyst throughput ↑), security (policy gates).

---

## 11) Next‑Steps Kanban (time‑boxed)

- [ ] **D1–D3:** Implement `/impl` core + tests; bootstrap `/experiments` with synthetic dataset & seeds.
- [ ] **D3–D5:** NL→Cypher cost model + preview; OPA eval stub; JSONL runs in CI artifacts.
- [ ] **D5–D7:** GDS receipts; coverage metrics; operator docs.
- [ ] **D7–D9:** SBOM/SLSA/cosign; verify workflow; release notes; disclosure pack.
- [ ] **D10:** Demo; canary slice; rollback plan; board‑ready one‑pager.

---

## 12) Integration Notes

- **Summit/IntelGraph/MC:** ingest Decision nodes and run receipts; tie Maestro run IDs to receipts; expose tri‑pane UI previews + policy reasons.
- **Switchboard:** surface verification status (SBOM/SLSA) and receipt presence in meeting co‑pilot summaries.

---

## 13) Risks & Mitigations

- **Perf regressions:** guard with budget enforcement + canary SLOs; add synthetic load tests (k6) for NL→Graph path.
- **Policy false blocks:** appeal workflow + human‑in‑the‑loop override with logging.
- **IP overlap risk:** maintain prior‑art table; focus claims on **policy‑receipt coupling** and **graph‑specific cost shaping**.
- **Data governance drift:** CI check for license/authority labels on all exports; block on missing.

---

## 14) Release Notes Template

**Added:** Eval harness; receipts runtime; preview cost model; SBOM/SLSA CI.  
**Changed:** NL→Cypher path now policy‑gated pre‑execution.  
**Fixed:** Missing coverage for intent classes.  
**Security:** Receipts include policy and license bindings; attested builds.  
**Ops:** p95 NL→Cypher <1.2s; p95 graph ops <1.0s on demo corpus.
