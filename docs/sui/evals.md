# SUI Evaluation Harness and Benchmarks

## Goal

Provide a deterministic benchmark harness that reproduces Gallagher-style quintile lift analysis
without using proprietary insurer data, while supporting a plug-in interface for insurer-owned claims
datasets.

## Dataset strategy

### Tier 1: synthetic baseline dataset

- Deterministic generator for insured entities, controls, exposures, leak signals, and claim labels.
- Fixed random seed and schema snapshots for repeatability.
- Used for CI smoke and reproducibility checks.

### Tier 2: open proxy dataset adapters

- Adapter interface for publicly available breach/security outcome datasets.
- Mapping layer normalizes fields into SUI feature schema.

### Tier 3: insurer private dataset interface

- Bring-your-own data contract with strict schema validation and tenant isolation.
- Local execution mode to avoid data egress from insurer boundary.

## Required metrics

### Claims-predictive scoring

- AUC
- PR-AUC
- Brier score
- Expected calibration error
- Quintile lift curve and highest-vs-lowest quintile lift ratio

### CVE exploitation prediction

- Precision@K
- Recall@K
- Time-to-signal (T+1d/T+30d/T+90d)

### Workflow outcomes

- Underwriting packet completion latency
- Drift alert precision and alert fatigue rate
- Analyst touch-time reduction

## UDR-AC benchmark (new)

**Underwriting Decision Reproducibility & Audit Completeness** validates:

1. Score identity across reruns (same snapshot/model/seed).
2. Explanation identity across reruns.
3. Artifact schema and hash-chain validity.
4. Policy decision consistency.
5. Absence of hidden non-determinism (ordering/time/floating variance).

Output fields:

- `udr_ac_score` (0.0-1.0)
- `failure_reasons[]`
- `non_determinism_vectors[]`

## Artifact schemas

### `metrics.json`

- `run_id`
- `dataset_id`
- `model_version`
- `seed`
- `claims_metrics` (AUC/PR-AUC/Brier/ECE)
- `lift_metrics` (quintile table + lift ratio)
- `workflow_metrics`
- `udr_ac_score`

### `report.json`

- `summary`
- `policy_checks`
- `security_checks`
- `determinism_checks`
- `failure_details`
- `approval_recommendation`

### `stamp.json`

- `git_sha`
- `toolchain_versions`
- `data_hash`
- `model_hash`
- `generated_at`

## Evidence ID

`EVIDENCE_ID = sui/<eval_name>/<git_sha>/<dataset_id>/<seed>`

## CI enforcement

- `evals/sui_smoke`: synthetic deterministic smoke test.
- `evals/tide_like_auc`: quintile-lift and calibration checks.
- `evals/cve_prediction`: fixed fixture ranking regression.
- `evals/udr_ac`: reproducibility + audit completeness gate.

Any drift in deterministic hashes fails CI.
