# Narrative Model Governance (GOV-NARR-001)

**Owner:** Governance
**Last-Reviewed:** 2026-01-22
**Status:** Active
**Authority:** Chief AI Officer

## Purpose
To establish the governance framework for Narrative Intelligence models, ensuring they operate within ethical boundaries and provide attributable, high-fidelity signals for Information Operations (IO) detection.

## 1. Model Requirements

### 1.1 Provenance & Attribution
*   All narrative models must ingest data with full lineage tracking (`Source` -> `Ingest` -> `Analysis`).
*   Output signals must map to the **Diamond Model** (Adversary, Capability, Infrastructure, Victim).
*   Models must not attribute intent without a confidence score > 0.85 and Human-in-the-Loop verification.

### 1.2 Ethical Constraints
*   **No Offensive Generation**: Models are strictly prohibited from generating false narratives or disinformation for offensive purposes.
*   **Counter-Narrative Safety**: Suggested counter-narratives must be "Truth-Based" (Framing: Explanation/Correction) and never "Distortion".

### 1.3 Domain Specificity
*   Models must tag results with `DomainContext` (Political, Economic, Social).
*   "Economic" domain models must comply with Market Abuse Regulation (MAR) monitoring standards.

## 2. Model Inventory

| Model ID | Name | Version | Type | Status | Ethical Check |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NARR-BEND-01` | BEND Framing Classifier | v1.0 | NLP/Classification | Beta | Passed |
| `NARR-SYNTH-01` | Synthetic Amp Detector | v0.9 | Anomaly Detection | Alpha | Pending |
| `NARR-CORR-01` | Cross-Domain Correlator | v0.5 | Time-Series | Experimental | N/A |

## 3. Evidence & Compliance

*   **Audit Logs**: All model inferences must be logged to `event_store` with `model_id` and `input_hash`.
*   **Performance Monitoring**: Accuracy and F1-score must be re-validated weekly against the `Golden Path` truth dataset.
