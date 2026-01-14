# Governance Ownership

**Status:** Active | **Last Reviewed:** 2025-05-12

This document defines the ownership and RACI (Responsible, Accountable, Consulted, Informed) matrix for governance domains within the Summit monorepo.

## Governance Board

The Governance Board is the accountable body for all policy and enforcement mechanisms.

*   **Chair:** VP of Engineering
*   **Members:** Security Lead, Platform Lead, Legal Counsel, Staff Engineers.

## RACI Matrix

| Domain | Responsible | Accountable | Consulted | Informed |
| :--- | :--- | :--- | :--- | :--- |
| **Policy Definition** | Security / Legal | Governance Board | Tech Leads | All Engineers |
| **CI/CD Gates** | Platform Engineering | DevOps Lead | Security | All Engineers |
| **Evidence Collection** | Release Captain | QA Lead | Auditor | Stakeholders |
| **Runtime Enforcement** | SRE / Ops | CTO | Security | Product Owners |

## Maintenance Policy

Governance documentation must remain accurate to be legally and operationally defensible.

### Review Cadence
*   **Quarterly:** Full review of all docs in `docs/governance/`.
*   **Triggered:** Any change to `make ga` or CI pipelines requires an immediate doc update.

### Verification
*   **Link Integrity:** Validated by `doc-link-check` workflow.
*   **Drift:** `governance-drift-check` verifies that `POLICIES.md` matches enforced configuration.

### Authoritative Source
In case of conflict:
1.  **Code/Configuration** (The Source of Truth)
2.  `docs/governance/` (The Official Documentation)
3.  `docs/ga/` or `docs/ops/` (Deprecated/Secondary)

## Code Owners

Detailed code ownership is maintained in the root `CODEOWNERS` file. This document provides the high-level mapping of governance domains to teams.

*   `docs/governance/**`: Governance Board
*   `.github/workflows/governance-*.yml`: Platform Engineering
*   `scripts/evidence/**`: QA / Release Engineering
