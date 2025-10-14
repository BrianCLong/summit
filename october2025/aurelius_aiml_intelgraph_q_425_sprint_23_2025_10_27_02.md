# AURELIUS — Next Sprint Plan (Sprint 23)

**Workstream:** IntelGraph — AI/ML Research & Engineering  
**Cadence Alignment:** Q4’25, **Sprint 23** (2025‑10‑27 → 2025‑11‑07, 10 business days)  
**Author:** AURELIUS  
**Version:** v1.0 (2025‑09‑30)

---

## 1) Objectives (What we will ship)
**O1 — Learned Cost Estimator v1:** Replace heuristic in `NL2CypherCostModel` with a lightweight learned regressor trained on synthetic + captured traces.
- **DoD:** MAE < 120ms vs measured runtime; p95 preview latency ≤ 250ms; model card present.

**O2 — End‑to‑End NL→Cypher Executor with Sandboxed Dry‑Run:** Add a dry‑run mode that executes on a sampled subgraph or EXPLAIN/PROFILE to validate estimates and surface plan diffs before full execution.
- **DoD:** `--dry-run` flag; plan diff report; false‑positive block rate < 3% on demo suite.

**O3 — Maestro/IG UI Hooks (Preview Pane + Receipts Viewer):** Tri‑pane UI: NL prompt → preview (cost/policy) → receipts.
- **DoD:** Interactive JSON receipts explorer; OPA rationale rendered; keyboard flow; telemetry events captured.

**O4 — Coverage & Robustness Expansion:** Intent taxonomies × policy paths × query templates → coverage ≥ 85%; fuzzing for prompt → Cypher failures.
- **DoD:** Coverage report artifact; <1% uncaught runtime errors in canary.

**O5 — IP Pack v2:** Expand claims; populate prior‑art CSV; first pass FTO memo with design‑arounds; inventor logs linked to run IDs.
- **DoD:** `/ip` updated with ≥2 independent + ≥8 dependent claims; ≥10 prior‑art entries.

---

## 2) KPIs & Targets
- **Latency:** NL→Cypher preview p95 ≤ 250ms; end‑to‑end p95 ≤ 1000ms (dry‑run path).  
- **Accuracy:** Cost MAE < 120ms; execution success ≥ 98% on goldens.  
- **Cost:** Token + DB cost/query ↓ ≥ 10% vs Sprint 22 baseline.  
- **Coverage:** ≥ 85% across intent × policy × templates grid.  
- **Reliability:** Flake rate < 1%; determinism ±1%.

---

## 3) Backlog (Stories & Estimates)
- **S1 (XL)** Trainable Cost Estimator
  - Data pipeline from `/experiments/runs` → features (`plan_stats`, `schema_stats`, `intent`, `tokens`) → labels (measured ms).
  - Models: linear, gradient boosted, tiny MLP; pick best via CV.  
  - Artifacts: `model.pkl`, `model_card.md`, `metrics.json`.
- **S2 (L)** Executor Dry‑Run + Plan Diff
  - Neo4j PROFILE/EXPLAIN adapter + sampling subgraph executor.  
  - Diff metrics: est vs actual; index usage; expansions.
- **S3 (M)** Maestro UI Hooks
  - React components: `PreviewCard`, `ReceiptDrawer`, `PolicyBadge`.  
  - IPC/SDK bridge to `ig_receipts_demo.py`.
- **S4 (M)** Coverage & Fuzzing
  - Intent × policy × templates matrix; hypothesis‑based fuzzers for prompt and schema variations.
- **S5 (S)** Telemetry/Provenance Enrichment
  - Add OpenTelemetry spans; export JSONL + OTLP; link run IDs ↔ receipts ↔ build attestations.
- **S6 (S)** IP Pack v2
  - Fill prior‑art; refine claims; draft figures.

---

## 4) Deliverables & Repro Pack Diffs
```
/impl/aurelius_core/
  cost_model_learned.py      # new
  executor.py                # dry-run + plan diff
  otel.py                    # spans around preview/execution
/ui/
  components/PreviewCard.tsx
  components/ReceiptDrawer.tsx
  components/PolicyBadge.tsx
/experiments/
  configs/cost_model_v1.yaml
  runs/  # new traces with measured vs predicted
  notebooks/cost_estimator.ipynb
/benchmark/
  coverage_matrix.md
  fuzzing_report.md
/ip/
  claims.md (v2)
  prior_art.csv (≥10 rows)
  fto.md (v1)
/integration/gh_actions/
  perf.canary.yml           # canary SLO checks
```

---

## 5) Technical Spec
### 5.1 Learned Cost Estimator
- **Feature schema (JSON):**
```json
{"node_est": int, "edge_est": int, "radius": int, "has_index": bool, "intent": "str", "pred_tokens": int, "where_clauses": int, "pattern_len": int}
```
- **Loss:** MAE; **Eval:** 5‑fold CV; **Serialization:** joblib; **Runtime:** <1ms predict.  
- **Fallback:** If model conf < τ, fall back to heuristic and tag receipt.

### 5.2 Executor Dry‑Run
- **Modes:** `--explain`, `--profile`, `--sample-rate` (0–1).  
- **Plan diff:**
```json
{"est_ms": float, "profile_ms": float, "operators": ["Expand(All)", "Filter"], "index_used": true, "est_error": float}
```
- **Policy loop:** If est_error > ε or forbidden ops, require appeal.

### 5.3 UI Components (shadcn/ui + Tailwind)
- `PreviewCard`: cost, policy result, CTA (Execute / Appeal).  
- `ReceiptDrawer`: json viewer with copy/download.  
- `PolicyBadge`: PASS/BLOCK/NEEDS REVIEW with tooltip rationale.

---

## 6) Interfaces & CLI
```bash
# Train cost model
python -m impl.cli.train_cost --runs experiments/runs --out impl/aurelius_core/models --seed 1337

# Preview with dry-run + receipts
python -m impl.cli.ig_eval --dataset experiments/datasets/demo_graph \
  --runs experiments/runs --seed 42 --budget_ms 1000 --dry-run --profile
```

**Python API:**
```python
from aurelius_core.cost_model_learned import LearnedCostModel
from aurelius_core.executor import DryRunExecutor

est = LearnedCostModel.load("impl/aurelius_core/models/model.pkl")
preview = nl2c.preview(q, schema_stats, user_ctx)
report = DryRunExecutor(profile=True, sample_rate=0.2).run(preview["cypher"], schema_stats)
```

---

## 7) Milestones & Calendar
- **M1 (D2):** Data extraction + features/labels; baseline linear regressor.  
- **M2 (D4):** Dry‑run executor + plan diff MVP; unit tests green.  
- **M3 (D6):** UI components integrated; OTEL spans wired.  
- **M4 (D8):** Model v1 selected + serialized; coverage ≥ 80%; fuzzing report.  
- **M5 (D10):** Canary perf gates pass; IP v2 merged; demo.

---

## 8) Acceptance Tests (DoD Gates)
- `make benchmark` prints KPI table with ✓/✗ vs targets.  
- Canary workflow (`perf.canary.yml`) enforces: preview p95 ≤ 250ms; end‑to‑end p95 ≤ 1000ms; error rate < 1%.  
- UI e2e (Playwright) validates preview→execute flow and receipts render.

---

## 9) Risks & Mitigations
- **Model underfits/overfits:** keep heuristic fallback; confidence‑aware routing; ablations.  
- **DB plan drift:** periodic re‑profiling; retrain on fresh traces.  
- **UI complexity:** scope to read‑only receipts v1; defer editing.  
- **Policy false blocks:** appeal flow stub + override logging.

---

## 10) IP & Compliance
- Update `/ip/claims.md` with learned‑cost + dry‑run coupling claims.  
- Fill `/ip/prior_art.csv` (≥10 curated entries).  
- SBOM and SLSA attach to UI artifacts; link run IDs ↔ attestations in receipts.

---

## 11) Make Targets & CI
```Makefile
train-cost:
	python -m impl.cli.train_cost --runs experiments/runs --out impl/aurelius_core/models --seed 1337

canary:
	python -m impl.cli.perf_canary --dataset experiments/datasets/demo_graph --budget_ms 1000 --p95 250

ui-dev:
	npm --prefix ui install && npm --prefix ui run dev
```

**New Workflow:** `.github/workflows/perf.canary.yml` checks p95 gates on PR; blocks if exceeded.

---

## 12) Demo Scenario (Sprint Review)
1) Analyst types NL query → PreviewCard shows est 420ms, PASS.  
2) Dry‑run produces profile 480ms (Δ +60ms), plan shows index scan; proceed.  
3) Execute; ReceiptDrawer shows lineage, params, policy, attestations; copy to clipboard.

---

## 13) Hand‑off Notes & Dependencies
- Requires access to Neo4j PROFILE/EXPLAIN or sampling harness.  
- UI depends on Maestro shell; provide mock SDK if unavailable.  
- Coordinate with Switchboard to surface build attestations.

---

## 14) Release Notes (Template)
**Added:** Learned cost estimator; dry‑run executor; Maestro receipts UI.  
**Changed:** Preview now confidence‑aware with heuristic fallback.  
**Fixed:** Coverage gaps; reduced false blocks.  
**Security/Prov:** Receipts cross‑link to SLSA attestations; OTEL spans for audit.

