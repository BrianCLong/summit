# INFOWAR Module Threat Model

## 1. Scope & Layer (MAESTRO Framework)
- **MAESTRO Layers**: Data, Agents, Observability, Security.
- **Goal**: Detect, characterize, and attribute IO/disinformation operations while maintaining defensive posture.

## 2. Threats Considered (Adversarial Conditions)

### T1: Narrative Poisoning (Data Layer)
- **Description**: An adversary injects malicious or misleading data into the ingestion stream (RSS, CSV) to poison the narrative graph.
- **Mitigation**: Schema validation for all ingested artifacts; confidence scoring for all claims; evidence-first requirement for high-confidence assertions.

### T2: Dual-Use Leakage / Offensive Misuse (Agents Layer)
- **Description**: The defensive analytics system is misused to identify vulnerabilities for offensive micro-targeting or influence operations.
- **Mitigation**: Access control for graph state; audit logging for all SITREP views and evidence exports; deny-by-default output for non-defensive queries.

### T3: Insider Risk / Credential Abuse (Infra Layer)
- **Description**: An internal actor with system access exports the narrative graph to an unauthorized third party.
- **Mitigation**: Structured audit events for every export; tamper-evident evidence stamps; rate limiting for graph traversal queries.

### T4: Liar's Dividend / Discrediting (Security Layer)
- **Description**: An adversary uses the system's own "Hypothesis" or "Low Confidence" labels to discredit factual findings or legitimate research.
- **Mitigation**: Explicit uncertainty boundaries in all SITREPs; mandatory evidence ID referencing; provenance ledger integrity checks.

## 3. Controls & Guardrails
- **Rate Limits**: REST endpoints for SITREPs and exports are rate-limited.
- **Redaction**: Raw PII and doxxing strings are redacted before ingestion into the graph.
- **Never-Log Scan**: CI scanner fails on forbidden patterns (PII, tokens) in code or test fixtures.
- **Deny-by-Default Output**: All module outputs default to the most restrictive visibility (SENSITIVE) unless explicitly downgraded with a justification.
