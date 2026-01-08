# Sprint Compliance Closure

**Sprint Objective:** Translate the now-defensible security and release posture into audit-ready compliance mappings (SOC-style, ISO-style, AI-governance-style) with minimal overhead and maximal reuse of existing artifacts.

## Structural Changes

1.  **Centralized Control Registry:** Created `docs/compliance/CONTROL_REGISTRY.md` as the single source of truth for all controls.
2.  **Audit-Ready Evidence:** Created `docs/compliance/EVIDENCE_INDEX.md` mapping controls to concrete file paths and verification commands.
3.  **Governance Formalization:** Established `docs/governance/GOVERNANCE_RULES.md` for release and approval policies.
4.  **Automated Drift Detection:** Implemented `verify:compliance` and `verify:governance` scripts to prevent documentation rot.

## Automated Enforcement

- **Governance Integrity:** `verify:governance` ensures key policy documents exist.
- **Evidence Validity:** `verify:compliance` fails CI if any artifact listed in the Evidence Index is deleted or moved.
- **Weekly Audits:** A scheduled GitHub Action runs these verifications weekly.

## Out of Scope

The following are explicitly **not** part of this repo's automated compliance system:

- Manual evidence collection (screenshots, emails).
- External auditor coordination.
- Legal interpretation of regulatory text.
