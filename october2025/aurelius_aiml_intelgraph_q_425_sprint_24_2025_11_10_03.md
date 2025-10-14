# AURELIUS — Next Sprint Plan (Sprint 24)

**Workstream:** IntelGraph — AI/ML Research & Engineering  
**Cadence Alignment:** Q4’25, **Sprint 24** (2025‑11‑10 → 2025‑11‑21, 10 business days)  
**Author:** AURELIUS  
**Version:** v1.0 (2025‑09‑30)

---

## 1) Objectives (What we will ship)
**O1 — Learned Cost Estimator v2 (Uncertainty‑Aware + Online Refresh):** Add predictive uncertainty (MC‑Dropout/Ensemble) and light online updates from fresh traces with drift detection.  
**DoD:** Calibration error (ECE) < 0.08; automatic retrain triggers on drift score > τ; rollout safely via feature flag.

**O2 — Query Rewriter & Budgeted Optimizer:** Introduce rule‑/model‑guided Cypher rewriting under latency/cost budgets (LIMIT pushes, predicate hoisting, index hints).  
**DoD:** ≥15% median cost reduction vs v1 on golden suite; no accuracy regressions; receipts note rewrites.

**O3 — Policy Appeal Workflow (Human‑in‑the‑Loop):** Implement structured appeal packets with diffs, risk summary, and override logging; capture decision SLAs.  
**DoD:** UI/API flow complete; appeals round‑trip < 2 min in demo; audit trail linked to receipts.

**O4 — Robustness & Red‑Team Pack:** Prompt‑level adversarial tests (jailbreaks, injection), schema perturbations, and policy bypass probes with mitigations.  
**DoD:** Robustness scorecard shipped; ≥90% block/mitigate rate on curated attack set; telemetry for incidents.

**O5 — SDK Packaging & GA Hardening:** Distribute `aurelius-core` as versioned SDK (Python + minimal JS bindings), semver + docs, with binary wheels and SBOMs.  
**DoD:** `pip install aurelius-core` (internal index) works; API docs, examples, and compatibility matrix; SBOM/SLSA attached.

---

## 2) KPIs & Targets
- **Latency/Cost:** +15% median cost reduction with rewriter; preview p95 ≤ 240ms; e2e p95 ≤ 950ms.  
- **Model Quality:** MAE ≤ 100ms; ECE ≤ 0.08; drift detection precision ≥ 0.9.  
- **Governance:** Appeal SLA p95 ≤ 2 min; 100% override logging with reasons.  
- **Security/Robustness:** ≥90% mitigation on attack set; <0.5% false allow.  
- **DX:** SDK install success ≥ 99% in CI matrix; docs coverage ≥ 85% of public API.

---

## 3) Backlog (Stories & Estimates)
- **S1 (XL)** Uncertainty‑Aware Cost Model + Drift
  - Techniques: Deep ensemble (K=5 tiny MLPs) or MC‑Dropout; conformal intervals; Page‑Hinkley drift detector.  
  - Artifacts: `model_v2/`, `calibration.json`, `drift_report.md`.
- **S2 (L)** Budgeted Query Rewriter
  - Rules: predicate pushdown, LIMIT/ORDER placement, index hints, OPTIONAL MATCH pruning; learned scorer fallback.  
  - Safety: semantic equivalence checks on sample; receipts annotate transformations.
- **S3 (M)** Appeal Workflow
  - Schema: `appeal.json` (intent, policy reason, diff, risk summary); storage + UI drawer; notification stub.  
  - Metrics: time‑to‑decision; override taxonomy (allow/deny/modify).
- **S4 (M)** Red‑Team Harness
  - Attack corpus: prompt injection/jailbreaks, data leakage probes, over‑broad matches; Hypothesis generators.  
  - Mitigations: template hardening, allow‑list ops, regex guards, intent‑policy cross‑check.
- **S5 (M)** SDK & Docs
  - Packaging: manylinux wheels; optional native ext for hashing; Typed API; examples; docsite (mkdocs).  
  - CI matrix: Py 3.10–3.12, Ubuntu/macOS/Windows.
- **S6 (S)** Maestro/IG UI polish
  - Inline diff viewer for rewrites; confidence badges; appeal CTA states.

---

## 4) Deliverables & Repro Pack Diffs
```
/impl/aurelius_core/
  cost_model_learned_v2.py     # ensemble + conformal
  drift.py                     # detectors + triggers
  rewriter.py                  # budgeted transformations
  appeal.py                    # packet builder + logger
  security/redteam.py          # attack corpora & tests
  __init__.py                  # stable public API
/sdk/python/
  pyproject.toml
  aurelius_core/               # packaged API wrapping impl
  wheels/
  docs/ (mkdocs)
/ui/components/
  RewriteDiff.tsx
  AppealDrawer.tsx
/experiments/
  configs/model_v2.yaml
  attacks/
    prompts.jsonl
    schemas.json
/benchmark/
  robustness_scorecard.md
  rewriter_ablation.md
/ip/
  claims.md (v3)  # add rewriting + uncertainty claims
  prior_art.csv (≥18 rows)
  fto.md (v2)
/integration/gh_actions/
  sdk.build.yml
  redteam.yml
```

---

## 5) Technical Specs
### 5.1 Uncertainty & Conformal Prediction
- **Predict:** mean μ, variance σ² (ensemble).  
- **Conformal:** non‑conformity = |y‑μ|; compute quantile q̂ on calibration set; interval [μ−q̂, μ+q̂].  
- **Routing:** if budget < lower bound → allow; if upper bound > budget → rewrite or appeal; else dry‑run.

### 5.2 Query Rewriter (Rules → Scorer)
- **Rule set (deterministic):** predicate hoisting, LIMIT pushdown, `USING INDEX` hints when selectivity > θ, remove dead OPTIONALs.  
- **Learned scorer:** gradient boosted ranking on (features, cost delta).  
- **Equivalence checks:** run on sampled graph; compare result schema + key counts; abort on mismatch.

### 5.3 Appeal Workflow
- **Packet schema:**
```json
{"query_id":"uuid","policy_reason":"string","preview":{...},"rewrite_diff":"udiff","risks":["data_exfil","excessive_cost"],"owner":"user@org","proposed_overrides":["limit=50"],"evidence":["plan.png","profile.json"]}
```
- **Audit:** signed overrides; link to SLSA build; include approver identity.

### 5.4 Red‑Team Harness
- Deterministic seeds; categories; expected policy outcome; mitigation mapping.  
- Outputs JSONL with verdicts and times; failure triage report.

### 5.5 SDK
- Namespaced API: `aurelius_core.preview`, `.execute`, `.appeal`, `.receipts`.  
- Versioning: semver; deprecation policy; compatibility table.

---

## 6) Milestones & Calendar
- **M1 (D3):** Ensemble + calibration complete; drift detector running on traces.  
- **M2 (D5):** Rewriter v1 + equivalence checks; receipts annotate rewrites.  
- **M3 (D7):** Appeal workflow end‑to‑end; UI polish.  
- **M4 (D9):** Red‑team harness + mitigations; SDK wheels built; docs first pass.  
- **M5 (D10):** Canary gates pass; deliver scorecards, ablations, IP v3.

---

## 7) Acceptance Tests (DoD Gates)
- `make redteam` yields ≥90% mitigation rate; zero critical leak paths.  
- `make rewriter_bench` shows ≥15% cost reduction, no correctness regressions.  
- Drift alert triggers retrain job in CI; post‑deploy evaluation within bounds.  
- SDK install/test matrix 100% green.

---

## 8) Risks & Mitigations
- **Rewrite correctness:** strict equivalence checks + canaries; rollback switch.  
- **Appeal backlog:** SLA alerts; templated responses; auto‑close on expiry.  
- **Uncertainty miscalibration:** periodic recalibration; temperature scaling fallback.  
- **Attack set incompleteness:** continuous mining; bug‑bounty‑style internal drills.

---

## 9) IP & Compliance
- Claims on uncertainty‑aware budget routing, budgeted rewriting with equivalence guard, and structured appeals tied to provenance receipts.  
- Expand prior‑art and FTO; ensure SDK license compliance (Apache‑2.0 preferred); SBOM/SLSA for wheels.

---

## 10) Release Notes (Template)
**Added:** Uncertainty‑aware estimator; budgeted query rewriter; appeal workflow; red‑team pack; Python SDK.  
**Changed:** Receipts now capture rewrites and confidence; drift‑aware routing.  
**Security/Prov:** Red‑team mitigations; appeal audit trail; SBOM/SLSA for SDK wheels.  
**Perf:** ≥15% cost reduction; preview p95 ≤ 240ms; e2e p95 ≤ 950ms.

