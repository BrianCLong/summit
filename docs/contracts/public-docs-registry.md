---
title: Public Documentation Registry
summary: Authoritative list of contract-grade public and semi-public documentation surfaces.
version: 2025.12
lastUpdated: 2025-12-27
owner: documentation
status: active
reviewCadence: each release (or quarterly, whichever comes first)
---

# Public Documentation Registry

This registry is the authoritative list of documentation surfaces that are treated as
**public or semi-public contracts**. Any document not listed here is **non-contractual**
(e.g., internal working notes, drafts, or historical artifacts) even if it is stored in
this repository.

## Classification Definitions

- **Public**: Intended for customers or external stakeholders. Must be contract-grade.
- **Semi-public**: Shared with partners under NDA or as part of demos/onboarding. Must be contract-grade.
- **Internal**: Not intended for external reliance. No guarantees; use at your own risk.

## Registry

| Doc ID  | Path                           | Audience    | Status      | Owner         | Review Cadence |
| ------- | ------------------------------ | ----------- | ----------- | ------------- | -------------- |
| DOC-001 | `README.md`                    | Public      | Public      | Platform Docs | Every release  |
| DOC-002 | `docs/README.md`               | Public      | Public      | Platform Docs | Every release  |
| DOC-003 | `docs/ONBOARDING.md`           | Public      | Public      | DevEx         | Every release  |
| DOC-004 | `docs/ARCHITECTURE.md`         | Public      | Public      | Architecture  | Every release  |
| DOC-005 | `docs/API_DOCUMENTATION.md`    | Public      | Public      | API Platform  | Every release  |
| DOC-006 | `docs/SECURITY_AND_PRIVACY.md` | Public      | Public      | Security      | Every release  |
| DOC-007 | `docs/DEPLOYMENT_GUIDE.md`     | Semi-public | Semi-public | Platform Ops  | Quarterly      |

## Ownership Expectations

Each document owner is accountable for:

- Maintaining a contract summary (guarantees, non-guarantees, conditions, out-of-scope).
- Keeping version and last-updated metadata current.
- Linking to evidence where claims require verification.
- Participating in review and approval workflows defined in
  [Documentation Contract Policy](../governance/documentation-contract-policy.md).

## Change Control

Updates to this registry require:

1. Documentation owner approval.
2. Relevant SME approval for newly added or reclassified documents.
3. An entry in the [Documentation Change Log](documentation-change-log.md).
