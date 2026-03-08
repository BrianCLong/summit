# Summit Underwriting Intelligence (SUI) Evidence & Evaluation

## 1. Overview
This document outlines the evaluation harness and evidence framework for Summit Underwriting Intelligence (SUI). The core philosophy is that every decision must be reproducible, auditable, and backed by deterministic evidence.

## 2. Evaluation Harness

### 2.1 Replicating Quintile Lift
To replicate Gallagher-style quintile lift analysis without proprietary claims data:
- **Datasets:** Utilize a mix of synthetic data and a plug-in interface for external insurer datasets.
- **Metrics:**
  - Area Under the Curve (AUC)
  - Precision-Recall AUC (PR-AUC)
  - Brier score
  - Calibration error
  - Quintile lift (A→E), "hockey stick" detection

### 2.2 Determinism Tests
All evaluations must run against fixed datasets with a fixed seed.
- Feature vectors must remain byte-stable across runs.
- Model training reproducibility tests verify fixed outputs from fixed inputs.

## 3. UDR-AC Benchmark
The **Underwriting Decision Reproducibility & Audit Completeness (UDR-AC)** is a core benchmark ensuring determinism.
- Given the same dataset snapshot, model version, and seed:
  1. The resulting score is identical.
  2. The explanation is identical.
  3. Evidence artifacts strictly validate.
  4. Policy checks return identical results.
  5. There is no hidden non-determinism (e.g., wall-clock reliance, floating point drift).
- Output: `udr_ac_score` (target ≥ 0.99 for GA) plus detailed failure reasons recorded in `report.json`.

## 4. Artifact Schemas

### Evidence ID Pattern
`EVIDENCE_ID = sui/<eval_name>/<git_sha>/<dataset_id>/<seed>`

### 4.1 `report.json`
Captures the overarching details of the evaluation run.
- **Run Metadata:** Evidence ID, timestamp (logical/deterministic), dataset ID, seed.
- **UDR-AC Metrics:** Score, failure reasons, validation state.

### 4.2 `metrics.json`
Contains specific evaluation metrics.
- AUC, PR-AUC, Brier score, Calibration error.
- Lift curves (including quintile separation data).
- Model and feature snapshot references.

### 4.3 `stamp.json`
Ensures the exact environment and input state can be reproduced.
- Hashes for datasets, model weights, and feature extraction logic.
- Environment details (versions of dependencies, etc.).
- The execution seed.
