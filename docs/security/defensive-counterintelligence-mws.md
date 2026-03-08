# Summit Defensive Counter-Intelligence & Insider-Threat Capability (MWS)

## Readiness Assertion

This capability is aligned to the Summit Readiness Assertion and governed by the Constitution and Agent Mandates. The objective is defensive: detect insider abuse, protect confidential reporting, and preserve information integrity through verifiable provenance controls.

## Minimal Winning Slice

Summit must:

1. Ingest insider activity events.
2. Run behavioral anomaly detection and risk scoring.
3. Verify evidence provenance and tamper resistance.
4. Protect confidential reporting with pseudonymization and redaction.
5. Fail CI when provenance, integrity, or confidentiality controls are missing.

## Acceptance Tests

- Insider activity events are ingested and normalized.
- Anomaly detection executes and emits a risk report.
- Evidence provenance chain validates end-to-end.
- Confidential reports are pseudonymized and identity-stripped.
- Security intelligence CI gates block merges on control failures.

## Capability Domains

### 1) Insider Threat Detection

Module scope:

- `src/security/insider-threat/event-ingestion.ts`
- `src/security/insider-threat/behavioral-baseline.ts`
- `src/security/insider-threat/anomaly-detection.ts`
- `src/security/insider-threat/risk-scoring.ts`

Core signal families:

- abnormal data access
- unusual repository activity
- privilege escalation
- mass export patterns
- off-hours behavior
- device anomaly bursts

Primary output:

- `artifacts/insider-risk-report.json`

### 2) Corporate Counter-Intelligence (Defensive)

Module scope:

- `src/security/counterintelligence/threat-model.ts`
- `src/security/counterintelligence/signal-fusion.ts`
- `src/security/counterintelligence/risk-evaluator.ts`

Threat categories:

- social engineering patterns
- credential compromise anomalies
- data exfiltration spikes
- dependency/supply-chain tampering
- repository sabotage anomalies

### 3) Information Integrity & Provenance

Module scope:

- `src/intelligence/provenance/provenance-graph.ts`
- `src/intelligence/provenance/evidence-hash-chain.ts`
- `src/intelligence/provenance/verification-engine.ts`

Primary outputs:

- `artifacts/evidence-chain.json`
- `artifacts/provenance-report.json`

### 4) Confidential Reporting (Protected Channel)

Module scope:

- `src/security/confidential-reporting/intake.ts`
- `src/security/confidential-reporting/pseudonymize.ts`
- `src/security/confidential-reporting/redaction.ts`
- `src/security/confidential-reporting/audit-log.ts`

Policy invariant:

- Reporter identity never enters the knowledge graph.

### 5) Influence / Manipulation Detection

Module scope:

- `src/intelligence/influence/narrative-cluster.ts`
- `src/intelligence/influence/coordination-detector.ts`
- `src/intelligence/influence/anomaly-score.ts`

Primary output:

- `artifacts/influence-detection.json`

## GraphRAG Integration

Nodes:

- `Source`
- `Evidence`
- `Claim`
- `Actor`
- `Event`
- `TrustScore`

Edges:

- `Actor -> performed -> Event`
- `Event -> affects -> Evidence`
- `Evidence -> supports -> Claim`
- `Evidence -> derived_from -> Source`

## CI Gate Contract

Security-intelligence workflow enforces:

- provenance-check
- tamper-check
- insider-risk-check
- confidentiality-check

Fail condition example:

- if `trust_score < 0.35`, fail CI.

## Performance Budgets

- event ingestion: `<10ms`
- risk scoring: `<50ms`
- provenance validation: `<5ms`

## Operational Artifacts

Expected artifacts for each run:

- `artifacts/insider-risk-report.json`
- `artifacts/evidence-chain.json`
- `artifacts/provenance-report.json`
- `artifacts/influence-detection.json`

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, insider misuse, data exfiltration, artifact tampering.
- **Mitigations**: provenance hash chains, deterministic gate checks, pseudonymization/redaction, audit trails, artifact evidence requirements.
