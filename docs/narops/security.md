# NarrativeOps Security Plan (GA)

## Summit Readiness Assertion
Security planning adheres to the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) and MAESTRO Threat Modeling Framework.

## MAESTRO Alignment (Required)
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: adversarial paraphrase, multilingual obfuscation, coordinated graph manipulation, data poisoning, tenant leakage, supply-chain compromise, goal manipulation, prompt injection, tool abuse.
- **Mitigations**: deterministic preprocessing, evidence budgeting, signed provenance, per-tenant isolation, SBOM pinning, anomaly detection on graph churn, and audit logs.

## Threat Model Summary
1. **Adversarial Text**: paraphrase and multilingual obfuscation to evade frame/strategy detection.
2. **Graph Manipulation**: botnets amplifying edges to distort community structure.
3. **Data Poisoning**: crafted inputs to bias clusters and strategies.
4. **Tenant Leakage**: cross-tenant embedding or cache contamination.
5. **Supply Chain Risks**: compromised dependencies or model weights.

## Controls (GA Minimum)
- **Input Validation**: schema validation and stable canonicalization.
- **Deterministic Execution**: pinned seeds and stable sorting.
- **Provenance & Signing**: signed evidence packs, immutable audit logs.
- **Isolation**: per-tenant encryption-at-rest, segregated indexes.
- **Anomaly Detection**: graph edge creation and churn monitoring.
- **SBOM**: CycloneDX generation per build, hash recorded in `stamp.json`.

## Security Test Plan (CI Gates)
- **Determinism Gate**: identical inputs produce identical hashes.
- **Isolation Gate**: multi-tenant test fixture verifies no data bleed.
- **Poisoning Gate**: adversarial fixture does not exceed drift threshold.
- **Supply Chain Gate**: SBOM hash present and matches pinned dependency list.

## Failure Modes & Responses
- Evidence gate failure → rollback to last green EID.
- Isolation gate failure → tenant index lock + incident report.
- Drift anomaly spike → quarantine run and re-evaluate thresholds.

## Governance Hooks
All policy decisions are expressed as policy-as-code and versioned. Ambiguities are **Deferred pending governance adjudication** and require reviewer sign-off.
