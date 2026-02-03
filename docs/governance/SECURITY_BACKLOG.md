# Security & Governance Backlog

This is the deterministic backlog for security vulnerabilities, governance gaps, and compliance action items.

## Schema Definition

| Field             | Description                                                                |
| :---------------- | :------------------------------------------------------------------------- |
| **id**            | Unique identifier (e.g., SEC-001).                                         |
| **category**      | code_scanning, dependabot, provenance, disclosure, iam, secret_management. |
| **severity**      | P0 (Critical), P1 (High), P2 (Medium), P3 (Low).                           |
| **affected_area** | Directory path or subsystem (e.g., `services/auth`).                       |
| **fix_type**      | config, docs, or code.                                                     |
| **owner**         | Team or individual responsible (aligned with `CODEOWNERS`).                |
| **status**        | backlog, in_progress, triage, resolved, exception.                         |
| **evidence_link** | Link to PR, scan result, or verification artifact.                         |
| **notes**         | Additional context or remediation details.                                 |

---

## Active Backlog Items

| id      | category          | severity | affected_area     | fix_type | owner               | status      | evidence_link   | notes                                                            |
| :------ | :---------------- | :------- | :---------------- | :------- | :------------------ | :---------- | :-------------- | :--------------------------------------------------------------- |
| SEC-001 | code_scanning     | P1       | repo_root         | docs     | @acme/security-team | resolved    | [PR #...](link) | Initial Triage Pack implementation.                              |
| SEC-002 | dependabot        | P2       | multiple          | code     | @acme/platform-core | backlog     | N/A             | Review transitive dependency vulnerabilities in production path. |
| SEC-003 | provenance        | P1       | infra/ci          | config   | @acme/ops-team      | resolved    | [PR #...](link) | SLSA Provenance and SBOM generation policy established.          |
| SEC-004 | disclosure        | P2       | SECURITY.md       | docs     | @acme/security-team | in_progress | N/A             | Clarify disclosure expectations and reporting process.           |
| SEC-005 | iam               | P1       | .github/workflows | config   | @acme/security-team | backlog     | N/A             | Audit GitHub Actions for broad `permissions:` and pin by SHA.    |
| SEC-006 | secret_management | P0       | repo_root         | code     | @acme/ops-team      | resolved    | [PR #...](link) | Secrets triage and rotation runbook added to security-triage.md. |

---

## Exception Log

_Exceptions must be approved by two Release Captains and have an expiry date._

| id      | category      | severity | approved_by  | expiry     | reason                                                  |
| :------ | :------------ | :------- | :----------- | :--------- | :------------------------------------------------------ |
| EXC-001 | code_scanning | P2       | Jules, Codex | 2026-02-15 | False positive in legacy module `apps/workflow-engine`. |
