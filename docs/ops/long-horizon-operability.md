# Long-Horizon Operability

**Status:** Draft
**Version:** 1.0
**Owner:** SRE / Ops

## Goal

Ensure Summit remains operable, maintainable, and recoverable over a long time horizon (5+ years), even with significant team turnover. Eliminate "tribal knowledge" by encoding operational wisdom into documentation and code.

## Knowledge Preservation Strategy

### 1. Decision Records (ADRs)

- **Purpose:** Capture the "why" behind architectural and operational decisions.
- **Format:** Markdown files in `docs/adr/` (Architecture Decision Records).
- **Requirement:** Any significant architectural change, tool selection, or process shift requires an ADR.
- **Status:** Proposed, Accepted, Deprecated, Superseded.

### 2. Runbooks & Playbooks

- **Purpose:** Step-by-step guides for routine operations and incident response.
- **Location:** `docs/ops/runbooks/`.
- **Critical Runbooks:**
  - `disaster-recovery.md`: Full system restore from backup.
  - `release-process.md`: How to cut and deploy a release.
  - `incident-response.md`: Roles, communication, and escalation.
  - `key-rotation.md`: How to rotate root secrets.

### 3. Architecture Diagrams

- **Purpose:** Visual representation of system components and data flow.
- **Format:** Mermaid diagrams (preferred for version control) or C4 model.
- **Location:** `docs/architecture/`.
- **Update Cadence:** Verified/updated quarterly.

### 4. "Bus Factor" Elimination

- **Audit:** Quarterly review of "who knows how to do X".
- **Mitigation:** If only one person knows X, they must write a runbook or pair with someone else to transfer knowledge.
- **Access:** No "God Mode" access restricted to a single individual. Use break-glass procedures.

## Operational Checklist

- [ ] **Backups:** Automated, verified (restore tested), and documented.
- [ ] **Logs:** Centralized, retention policy defined, no PII.
- [ ] **Metrics:** Golden signals (Latency, Traffic, Errors, Saturation) covered for all services.
- [ ] **Tracing:** Distributed tracing enabled for cross-service requests.
- [ ] **Secrets:** Managed via vault/KMS, not in code/config.
- [ ] **IaC:** All infrastructure defined in Terraform/Helm. No manual console changes.

## ADR Index (Example)

| ID      | Title                       | Status   | Date       |
| :------ | :-------------------------- | :------- | :--------- |
| ADR-001 | Use Monorepo Structure      | Accepted | 2024-01-01 |
| ADR-002 | Adopt OpenTelemetry         | Accepted | 2024-02-15 |
| ADR-003 | Secret Management via Vault | Accepted | 2024-03-10 |
