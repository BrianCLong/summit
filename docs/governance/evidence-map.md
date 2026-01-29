# Summit Evidence Map

**Status:** Operational
**Purpose:** Defines the machine-verifiable evidence artifacts required for Governance, Risk, and Compliance (GRC) certification.
**Reference:** Extends `docs/governance/CONTROL_EVIDENCE_INDEX.md`.

## 1. Zero-Trust Data Governance (DT-001)

| Evidence ID | Artifact Path | Description | Producer | Verifier |
| :--- | :--- | :--- | :--- | :--- |
| `data_access_logs` | `logs/audit/data_access_*.json` | Immutable log of policy decisions for data access. | `PolicyEngine` | `scripts/audit/verify_logs.ts` |
| `registry_validation_report` | `artifacts/evidence/governance/registry_check.json` | Confirmation that all runtime assets exist in registry. | `scripts/ci/verify_data_registry.mjs` | `CI Gate: Data Governance` |

## 2. Runtime Assurance (RT-001)

| Evidence ID | Artifact Path | Description | Producer | Verifier |
| :--- | :--- | :--- | :--- | :--- |
| `drift_metrics` | `metrics/model/drift_*.json` | Statistical distance metrics (PSI/KL) vs training baseline. | `ModelMonitor` | `scripts/monitor/alert_on_drift.py` |
| `intervention_events` | `logs/interventions/circuit_breaker_*.json` | Log of automated safety stops triggered by policy. | `PolicyEngine` | `scripts/audit/count_interventions.ts` |
| `risk_telemetry` | `metrics/risk/score_*.json` | Real-time risk scores computed for operations. | `PolicyEngine` | `OpsDashboard` |

## 3. Operational Oversight (OP-001)

| Evidence ID | Artifact Path | Description | Producer | Verifier |
| :--- | :--- | :--- | :--- | :--- |
| `council_meeting_minutes` | `governance/records/minutes/YYYY-MM-DD.md` | Signed minutes of Governance Council. | Governance Secretariat | `scripts/governance/verify_quorum.ts` |
| `decision_register` | `governance/records/decisions.yaml` | Ledger of strategic governance approvals. | Governance Secretariat | `scripts/governance/verify_approvals.ts` |

## 4. Regulatory Alignment (Core)

| Evidence ID | Artifact Path | Description | Framework Mapping |
| :--- | :--- | :--- | :--- |
| `system_inventory` | `artifacts/evidence/governance/ai-inventory.json` | Complete AI system list. | NIST AI RMF (MAP) |
| `provenance_trace` | `.evidence/provenance.json` | SLSA-compliant build/data provenance. | EU AI Act (Art 10) |
| `model_cards` | `docs/models/*.md` | Transparency disclosures. | EU AI Act (Art 13) |

## Validation Policy
*   All artifacts must be present in the **Release Evidence Bundle**.
*   JSON artifacts must satisfy their defined JSON Schemas.
*   Logs must be cryptographically chained (where applicable).
