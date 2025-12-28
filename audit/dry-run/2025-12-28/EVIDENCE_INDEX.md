# Audit Dry-Run Evidence Index

**Date:** 2025-12-28  
**Purpose:** Map audit claims to versioned evidence with direct repository paths.

## A) Product & System Behavior

| Claim                                                | Evidence                                                            | Notes                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| GA scope defined with explicit inclusions/exclusions | `LAUNCH_SCOPE.md`                                                   | Includes freeze rules and exclusions.      |
| GA pre-launch checks defined                         | `LAUNCH_CHECKLIST.md`                                               | Checklist used in launch readiness.        |
| API contract locking is GA-complete                  | `audit/ga-evidence/api-contracts/IMPLEMENTATION_SUMMARY.md`         | GA-E3 deliverable summary.                 |
| API version registry and middleware exist            | `api-schemas/registry.json`, `server/src/middleware/api-version.ts` | Referenced by GA-E3 summary.               |
| Schema diff tool exists                              | `scripts/schema-diff.ts`                                            | CI + local usage defined in GA-E3 summary. |

## B) Governance & Decision Records

| Claim                                         | Evidence                                                                                                           | Notes                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Governance policy bundle and audit logs exist | `audit/ga-evidence/governance/policy-bundle-manifest.json`, `audit/ga-evidence/governance/policy-audit-log.json`   | Includes hashes + audit log entries. |
| Governance verdict schema + examples          | `audit/ga-evidence/governance/governance-verdict-schema.json`, `audit/ga-evidence/governance/sample-verdicts.json` | ABAC enforcement examples.           |
| Governance decision escalation record         | `audit/ga-evidence/governance/governance-decision-sample.json`                                                     | Shows escalation to human.           |
| Graduation workflow documented                | `docs/REPO_BOUNDARIES.md`                                                                                          | Defines graduation workflow.         |
| Shipping graph defined                        | `docs/SHIPPING_GRAPH.md`                                                                                           | System unit list.                    |
| Go/No-Go template present                     | `GO_NO_GO_GATE.md`                                                                                                 | Template; no signed record.          |

## C) Compliance & Controls

| Claim                                           | Evidence                                                                                                           | Notes                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Control inventory + mappings are centralized    | `COMPLIANCE_CONTROLS.md`, `COMPLIANCE_EVIDENCE_INDEX.md`, `COMPLIANCE_SOC_MAPPING.md`, `COMPLIANCE_ISO_MAPPING.md` | Evidence paths in index.       |
| Evidence bundle published with integrity checks | `audit/ga-evidence/README.md`                                                                                      | SHA-256 verification guidance. |
| SOC2 control matrix exists                      | `audit/ga-evidence/SOC2-CONTROL-MATRIX.md`                                                                         | Control coverage summary.      |

## D) Security & Access

| Claim                             | Evidence                                               | Notes                    |
| --------------------------------- | ------------------------------------------------------ | ------------------------ |
| Access control matrix maintained  | `audit/ga-evidence/security/access-control-matrix.csv` | RBAC/ABAC roles.         |
| Sample access decisions logged    | `audit/ga-evidence/governance/sample-verdicts.json`    | Allow/deny samples.      |
| Incident response plan exists     | `audit/ga-evidence/security/incident-response-plan.md` | Response procedures.     |
| Security exceptions tracked       | `docs/security/EXCEPTIONS_REGISTRY.md`                 | Risk acceptance records. |
| Security risk register maintained | `docs/security/RISK_REGISTER.md`                       | Risk inventory.          |

## E) Delivery & Change Management

| Claim                        | Evidence                                           | Notes                               |
| ---------------------------- | -------------------------------------------------- | ----------------------------------- |
| PR quality gate in CI        | `.github/workflows/pr-quality-gate.yml`            | CI enforcement for quality + smoke. |
| Schema diff gate             | `.github/workflows/schema-diff.yml`                | Breaks block merges.                |
| Change management log exists | `audit/ga-evidence/ops/change-management-log.json` | CAB change evidence.                |
| SLO compliance evidence      | `audit/ga-evidence/ops/slo-compliance-report.json` | Availability reporting.             |
| Canary rollback occurred     | `deployment-failure-20251225-050305.json`          | Rollback on SLO failure.            |
| Release evidence exists      | `deployment-success-20251225-043102.json`          | Successful deployment evidence.     |

## F) People & Org Controls

| Claim                                | Evidence                          | Notes                              |
| ------------------------------------ | --------------------------------- | ---------------------------------- |
| Decision rights / governance charter | `docs/governance/CONSTITUTION.md` | Authority model.                   |
| Ownership model documented           | `OWNERSHIP_MODEL.md`              | Role clarity + accountability.     |
| Code ownership enforced              | `CODEOWNERS`                      | Segregation of duties + approvals. |

---

**Owner:** External Audit Readiness Lead  
**Next Refresh:** 2026-01-04
