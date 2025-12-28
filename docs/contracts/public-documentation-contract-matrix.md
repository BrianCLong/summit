---
title: Public Documentation Contract Matrix
summary: Contract-grade matrix mapping public documentation claims to guarantees and exclusions.
version: 2025.12
lastUpdated: 2025-12-27
owner: documentation
status: active
reviewCadence: each release
---

# Public Documentation Contract Matrix

This matrix maps each public/semi-public document to its enforceable claims, explicit
non-guarantees, conditions, and evidence anchors. It is authoritative for audit and
truth-enforcement reviews.

> Source of truth for document scope: [Public Documentation Registry](public-docs-registry.md).

## Matrix

| Doc ID  | Primary Claims                                  | Guarantees                                                                                      | Not Guaranteed                                                            | Conditional                                                                       | Out of Scope                                 | Evidence Links                                                                                                                     |
| ------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| DOC-001 | Quickstart, golden path, core endpoints.        | Local dev stack starts when prerequisites are met; `make smoke` validates the golden path flow. | Production readiness, uptime, or performance beyond local dev.            | Requires Docker Desktop ≥ 4.x, Node 18+, pnpm 9, Python 3.11+.                    | Hosting, support SLAs, regulated deployment. | [GOLDEN_PATH.md](../GOLDEN_PATH.md), [CI_STANDARDS.md](../CI_STANDARDS.md)                                                         |
| DOC-002 | Canonical entry point to docs.                  | Links in the index resolve to current public docs.                                              | Exhaustive inventory of every internal doc.                               | Archived docs are not authoritative.                                              | Feature roadmap commitments.                 | [Public Docs Registry](public-docs-registry.md)                                                                                    |
| DOC-003 | Developer onboarding in ≤10 minutes.            | Steps reflect the supported local dev path and match golden path validation.                    | Success on unsupported hardware or without prerequisites.                 | Optional AI stack requires additional compose overlays.                           | Production deployments.                      | [ONBOARDING_WALKTHROUGH.md](../ONBOARDING_WALKTHROUGH.md), [GOLDEN_PATH.md](../GOLDEN_PATH.md)                                     |
| DOC-004 | Architecture overview and component boundaries. | Describes the MVP-3 GA architecture contract and system boundaries.                             | Exact implementation details, third-party SLAs, or future roadmap.        | Component availability depends on feature flags and deployment profile.           | Vendor-specific sizing guidance.             | [REPO_BOUNDARIES.md](../REPO_BOUNDARIES.md), [ARCHITECTURE.md](../ARCHITECTURE.md)                                                 |
| DOC-005 | API documentation access and scope.             | OpenAPI + GraphQL docs reflect published API surfaces for the current release.                  | Unversioned stability or deprecated endpoints after removal windows.      | Access requires valid credentials and tenant permissions.                         | SDKs or client-side wrappers.                | [API_VERSIONING.md](../API_VERSIONING.md), [API_RATE_LIMITING.md](../API_RATE_LIMITING.md), [contracts/inventory.md](inventory.md) |
| DOC-006 | Security & privacy controls in scope.           | Describes active controls and governance posture at MVP-3 GA.                                   | Certification claims (SOC 2, FedRAMP) unless explicitly stated elsewhere. | Control effectiveness depends on deployment configuration and policy enforcement. | Customer-specific risk acceptance.           | [SECURITY_VALIDATION.md](../SECURITY_VALIDATION.md), [COMPLIANCE_CONTROLS.md](../COMPLIANCE_CONTROLS.md)                           |
| DOC-007 | Production deployment guidance.                 | Steps align with supported K8s + Helm deployment model.                                         | Support for alternative orchestrators or unmanaged databases.             | Requires compliant secrets management and network policies.                       | Migration from legacy v0.x.                  | [DEPLOYMENT.md](../DEPLOYMENT.md), [ENV_VARS.md](../ENV_VARS.md)                                                                   |

## Review Notes

- Any new public or semi-public doc must be added here and to the registry.
- Claims in each document must map to an evidence anchor or an explicit exclusion.
