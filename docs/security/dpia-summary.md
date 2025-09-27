# Data Protection Impact Assessment (DPIA) Summary

## Scope
- Processing activities: investigative case management, telemetry enrichment, federated intelligence sharing.
- Data subjects: platform tenants' analysts, investigative subjects, anonymized telemetry participants.
- Systems evaluated: AuthZ Gateway, Conductor GraphQL APIs, analytics pipelines, audit ledger.

## Risk assessment
| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Cross-tenant data leakage | Low | High | ABAC/OPA tenant policy with deny-by-default and cross-tenant exemptions only for `platform_super_admin`. |
| Excessive retention of PII | Medium | High | Policy-enforced 30-day default, lifecycle rules, retention obligations returned to callers. |
| Unauthorized purpose expansion | Medium | Medium | Purpose tag enforcement and SCIM-provisioned roles scoped to legal bases. |
| Audit tampering | Low | High | Immutable ledger + OPA denies `audit:*` mutations. |
| Credential phishing / MFA bypass | Medium | High | WebAuthn step-up for high-risk actions, detection of assurance downgrade attempts. |

## Residual risk
- Acceptable with controls: All risks downgraded to Low/Medium after mitigation; continuous monitoring via policy simulation in CI and production.
- Additional guardrails: quarterly red-team scenarios covering misuse/abuse cases; anomaly detection on policy denies.

## Data subject rights
- Access/export: Provided via purpose-tagged API endpoints with automatic minimization.
- Rectification: Only appended corrections; original records remain for audit.
- Deletion: Enforced via retention engine; PII defaults to 30-day purge with documented exceptions.

## Decision
- Proceed with deployment under Privacy-by-Design commitments; enforce change management for any new purpose or attribute ingestion and update DPIA accordingly.
