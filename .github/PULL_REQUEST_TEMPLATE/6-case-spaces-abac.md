# Case Spaces + Audit Trail + ABAC (OPA) + SCIM/OIDC

## Scope

- Services: services/cases, services/audit, services/auth
- ABAC labels; reason-for-access prompts; WebAuthn step-up

## Acceptance Criteria

- Immutable audit (who/what/when) queriable
- Step-up auth on sensitive reads
- SCIM provisioning flows green in E2E
