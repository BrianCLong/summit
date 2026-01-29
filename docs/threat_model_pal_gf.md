# Threat Model: Palantir/Foundry Subsumption

## 1. Overview
This document outlines the threat model and safety requirements for the "Palantir Gotham and Foundry" capabilities subsumption (Ontology, Operational Apps, Governance).

## 2. Identified Risks
Public reporting (e.g., WIRED) highlights risks associated with surveillance platforms, authoritarian misuse, and opaque decision-making outcomes.
Specific risks include:
- **Unchecked Data Access**: Users accessing sensitive data without a valid purpose.
- **Microtargeting/Surveillance**: Misuse of entity resolution and graph traversal for targeting individuals.
- **Opaque Logic**: Decisions made by "AI" or complex rules without clear audit trails or explanation.
- **Scope Creep**: Capabilities intended for one purpose being used for another (e.g., counter-terrorism tools used for routine policing or HR).

## 3. Summit Requirements (Abuse / Safety)
To mitigate these risks, the Summit implementation enforces the following requirements:

### 3.1 Strong Access Controls (Deny-by-Default)
- **RBAC + ABAC**: Access requires both Role-Based (who you are) and Attribute-Based (why you need it/context) authorization.
- **Default Deny**: All object and action access is denied unless explicitly allowed by policy.
- **Scope Restriction**: Actions must have explicit scopes.

### 3.2 Audit & Evidence
- **Immutable Logs**: All actions (allowed and denied) must be logged to an immutable audit trail.
- **Evidence Bundles**: Every operational workflow must emit a signed evidence bundle (`report.json`, `metrics.json`, `stamp.json`) referenced in `evidence/index.json`.
- **Preflight Diffs**: Actions must undergo a "preflight" simulation to determine impact before execution.

### 3.3 Privacy & Data Governance
- **Never-Log Fields**: Fields containing PII/PHI (e.g., `ssn`, `email`) must be tagged as `neverLog` and redacted from all logs and evidence artifacts.
- **Retention Policy**: Data retention must be enforced via scheduled purge jobs.
- **Redaction Pipeline**: Evidence generation must pass through a redaction pipeline.

### 3.4 Impact Checks
- **Bias/Impact Review**: Decisions affecting people must have policy hooks for bias checks and human review workflows.
