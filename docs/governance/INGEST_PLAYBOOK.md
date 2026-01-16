Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# System Ingest Playbook

**Mission**: Define how external systems are evaluated, classified, and absorbed into Summit.

## 1. Due Diligence Checklist

Before any code or data enters Summit, the Target System must undergo a rigorous evaluation.

### Architecture

- [ ] **State Management**: Where does state live? (DB, File, Memory)
- [ ] **Dependencies**: Are dependencies compatible with Summit's stack? (License, Security)
- [ ] **API Surface**: Is the API well-defined? Can it be wrapped or replaced?
- [ ] **Scalability**: Does it meet Summit's performance standards?

### Data Models

- [ ] **Schema Analysis**: Does the data map to the Summit Ontology (Person, Org, Event)?
- [ ] **Data Quality**: Is the data clean, or does it require sanitization?
- [ ] **Format**: Can the data be exported to standard formats (JSON, Parquet, Graph)?

### Security Posture

- [ ] **AuthN/AuthZ**: Does it support OIDC/JWT? Can it integrate with OPA?
- [ ] **Vulnerabilities**: Recent scan results? (CVEs, OWASP Top 10)
- [ ] **Secrets Management**: Are secrets externalized?

### Governance Compatibility

- [ ] **Provenance**: Can the system track lineage of data and actions?
- [ ] **Audit Logs**: Does it produce tamper-evident logs?

## 2. Classification & Disposition

Based on the Due Diligence, assign a classification:

| Classification         | Definition                                 | Action                                                    |
| :--------------------- | :----------------------------------------- | :-------------------------------------------------------- |
| **Full Absorption**    | High alignment. Code and Data join Summit. | Refactor to align with Summit patterns. Deploy as Module. |
| **Partial Extraction** | Valuable Data, Legacy Code.                | Ingest Data to Graph. Discard Code.                       |
| **Quarantine**         | High Risk or Unknown.                      | Deploy in isolated sandbox. Bridge via API only.          |
| **Rejection**          | No strategic value or fatal flaws.         | Do not ingest. Document reasoning.                        |

## 3. The Ingest Lifecycle

1.  **Discovery**: Identify the Target System.
2.  **Evaluation**: Execute Due Diligence.
3.  **Classification**: Assign Disposition.
4.  **Planning**: Create a `MIGRATION_PLAN.md`.
5.  **Execution**:
    - Phase 1: Data Mirroring (Read-only).
    - Phase 2: Control Plane Cutover (Write via Summit).
    - Phase 3: Code Sunset.
6.  **Verification**: Confirm "No Parallel Truths".
7.  **Decommission**: Shut down the Target System.

## 4. Sunset Plans

**No integration without a decommission plan.**
Every Ingest Plan must include a date and criteria for turning off the old system.
