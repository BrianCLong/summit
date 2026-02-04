# Governance Evidence Integrity Control

## Overview
This control ensures that all "active" governance documents in `docs/governance/` are backed by verifiable evidence. It prevents the publication of governance claims that cannot be audited.

## Enforcement Mechanism
The control is enforced through two primary mechanisms:
1.  **Python Script**: `scripts/governance/enforce_evidence_id_validity.py`
2.  **CI Gate (JavaScript)**: `scripts/ci/verify_governance_docs.mjs`

Both scripts scan the frontmatter of markdown documents in `docs/governance/` and verify that any document with `Status: active` has a non-empty `Evidence-IDs` field that is not set to `none`.

## Why It Matters
A governance platform that allows "empty" or "none" evidence for active policies is a liability. By enforcing Evidence-ID presence, Summit guarantees that:
- Every active policy has a corresponding implementation artifact.
- Auditors can trace policies back to concrete evidence in the `COMPLIANCE_EVIDENCE_INDEX.md`.
- No "shadow governance" exists without a paper trail.

## Usage
To run the check locally:
```bash
python3 scripts/governance/enforce_evidence_id_validity.py
```
or
```bash
node scripts/ci/verify_governance_docs.mjs
```

## Failure Remediation
If a document fails the check:
1.  Identify the missing evidence for the policy.
2.  Add the evidence ID (e.g., `GOV-001`) to the `Evidence-IDs` field in the document's frontmatter.
3.  Ensure the ID exists in the global `COMPLIANCE_EVIDENCE_INDEX.md`.
4.  If the policy is still being drafted, change the `Status` to `planned`.
