# Summit Underwriting Intelligence (SUI) Architecture

## 1. Overview
Summit Underwriting Intelligence (SUI) is a graph-native, agentic underwriting system designed to produce claims-predictive risk scoring, portfolio monitoring, actionable remediation playbooks, and auditable, deterministic evidence artifacts.

## 2. Core Components & Boundaries

### Data Plane (`connectors/`, `graph/`)
- `connectors/osint/leaked_info/`: Handles pastebins, breach mentions, and credential dumps (policy-gated).
- `connectors/attack_surface/`: Maps domain to assets to exposures via sanctioned scanners.
- `connectors/cve_intel/`: Processes CVE metadata, exploit signals, and internal threat intel.
- `graph/schema/insurance_risk/`: Graph entities and relationships.
- `graph/provenance/`: Tracks source, timestamp, and confidence for every edge and feature.

### Modeling Plane (`risk_models/`)
- `tide_like/`: Handles feature selection, explainability, calibration, and quintiles.
- `cve_exploit_prediction/`: Predicts probability of exploitation across time horizons.

### Agent Plane (`agents/underwriting/`)
- `UnderwriteAgent`: Generates quote packets, decision rationales, and required controls.
- `PortfolioDriftAgent`: Detects changes and triggers remediation workflows.
- `RemediationAgent`: Manages ticketing, vendor outreach, and proof collection.

### Evidence Plane (`evidence/`)
- Emits deterministic artifacts: `report.json`, `metrics.json`, `stamp.json`.

## 3. Dependency Graph
`connectors/*` -> `graph/ingest` -> `feature_store` -> `risk_models/*` -> `agents/*` -> `evidence/*` -> `ui + api`

## 4. API Contracts

### `/score`
Generates a risk score for a given domain/entity based on a deterministic snapshot of data.
- **Input:** Entity ID, snapshot reference.
- **Output:** Score (A-E quintile), deterministic evidence ID.

### `/explain`
Provides feature importance and decision rationale for a given score.
- **Input:** Evidence ID.
- **Output:** Explainability matrix, contributing factors.

### `/portfolio/drift`
Analyzes a portfolio for risk drift over a specified time window.
- **Input:** Portfolio ID, time window.
- **Output:** Drift metrics, list of entities with significant changes.

## 5. Determinism Strategy (Snapshot-centric Scoring)
Scoring strictly runs against an immutable "portfolio snapshot" object. This ensures perfect reproducibility, safe multi-tenant isolation, and prevents hidden non-determinism (time, ordering, floating drift).

## 6. Evidence Artifact Plumbing
Every decision generates deterministic evidence artifacts.
- **Evidence ID Pattern:** `EVIDENCE_ID = sui/<eval_name>/<git_sha>/<dataset_id>/<seed>`
- **Artifacts:**
  - `artifacts/evidence/EVIDENCE_ID/report.json`
  - `artifacts/evidence/EVIDENCE_ID/metrics.json`
  - `artifacts/evidence/EVIDENCE_ID/stamp.json`

## 7. PR Stack Breakdown
1. **PR-1:** Scaffold SUI service + evidence framework (`sui-api`, `evidence` lib, `determinism` pkg).
2. **PR-2:** Graph schema + provenance + feature extraction for leaked info and attack surface.
3. **PR-3:** TIDE-like scoring model (quintiles + explainability).
4. **PR-4:** CVE exploitation prediction subsystem.
5. **PR-5:** Underwriting workflow agent + portfolio drift + remediation orchestration.
6. **PR-6:** Governance, security hardening, SBOM, and GA controls.
