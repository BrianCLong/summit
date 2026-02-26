# INFOWAR Analytics Guardrails

## 1. No Offensive Enablement
The INFOWAR module is strictly for defensive purposes (detection, characterization, attribution, and incident response). Any use for offensive operations, micro-targeting, or disinformation dissemination is strictly prohibited and violates the [Summit Code of Conduct](../../CODE_OF_CONDUCT.md).

## 2. Uncertainty Policy
- **Confidence Scores**: Every narrative node and claim MUST carry a confidence score (0.0–1.0).
- **Hypothesis Labeling**: Any claim with a confidence score below 0.5 MUST be labeled as a "HYPOTHESIS" and should not be presented as a factual finding in any SITREP.
- **Evidence Requirement**: High-confidence claims (≥ 0.8) MUST reference at least one valid Evidence ID from the Provenance Ledger.

## 3. Redaction & Privacy
- **Raw PII**: Personal identifiers (e.g., real names, phone numbers, home addresses) discovered during ingestion MUST be redacted before being stored in the graph.
- **Never-Log Fields**: Raw handles, doxxing strings, and private messaging content are classified as "NEVER-LOG" and should never appear in system logs or SITREPs.
- **Auditable Export**: Any export of evidence or graph state must be logged in the tamper-evident audit trail with a justification.

## 4. Attribution Guardrails
- **Actor Identification**: Attribution to specific state actors or organizations must be supported by multiple independent evidence lines.
- **Probabilistic Labeling**: Attribution should use probabilistic terms (e.g., "Highly Likely", "Likely", "Uncertain") rather than definitive assertions where absolute proof is absent.

## 5. Audit Format
Exports must follow the standard evidence bundle format, including `report.json`, `metrics.json`, `stamp.json`, and `index.json`, to ensure explainability and lineage.
