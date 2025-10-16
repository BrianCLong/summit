# COS-ID-SCIM-ABAC — OIDC/SCIM + ABAC Enforcement

## Goal
Enforce tenant-scoped attribute-based access control (ABAC) while synchronizing identity data via OIDC and SCIM v2, ensuring purpose-based access decisions with comprehensive auditing and a secure break-glass process.

## Key Outcomes
- Unified login for console and API with tenant and purpose attributes propagated end-to-end.
- Deterministic SCIM role-to-CompanyOS role mapping that updates within 60 seconds.
- OPA-backed allow/deny decisions for all data plane operations, producing structured audit trails.
- Documented break-glass account lifecycle with rotation and validation automation.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Identity Provider (IdP) | Issues OIDC tokens and SCIM events; source of truth for groups. |
| Auth Gateway | Performs OIDC flows, derives tenant/purpose claims, attaches metadata to requests. |
| SCIM Worker | Consumes SCIM webhooks, maps IdP groups to COS roles/tenants, persists assignments. |
| OPA Policy Engine | Evaluates ABAC rules authored in Rego and enforced at gateway and services. |
| Audit Service | Collects `{sub, tenant, purpose, decision}` events and forwards to SIEM. |
| Break-Glass Vault | Stores emergency credentials, rotation metadata, and access logs. |

### Sequence Diagram (Textual)
1. User authenticates via OIDC; Auth Gateway exchanges code for tokens and validates signatures.
2. Gateway enriches request context with tenant + purpose attributes (from token claims or lookup) and queries OPA for decision.
3. OPA evaluates ABAC policy pack (referencing tenant/purpose matrices) and returns allow/deny.
4. Downstream services enforce decision; audit event emitted with full context.
5. SCIM webhook posts role updates → SCIM Worker validates Sigstore signature, updates mapping store, notifies OPA bundle generator.

## Implementation Plan
### Phase 0 — Foundations (Week 1)
- Finalize ABAC matrix with Security; model tenants, purposes, and resource actions.
- Set up dedicated secrets for OIDC client credentials and SCIM signing keys using External Secrets.

### Phase 1 — OIDC Integration (Weeks 1-2)
- Implement PKCE/OAuth flows for console and API, including JWKS rotation and cache invalidation.
- Extend session middleware to attach tenant + purpose attributes; fallback to directory lookup when absent.
- Add login success/failure metrics and alerts for authentication anomalies.

### Phase 2 — SCIM Synchronization (Weeks 2-3)
- Build SCIM ingestion worker with replay protection, Sigstore validation, and exponential backoff retries.
- Create group-to-role mapping store (PostgreSQL table) with change tracking for auditability.
- Implement contract tests using MC sandbox data to ensure role projections align with expectations.

### Phase 3 — ABAC Enforcement (Weeks 3-4)
- Author Rego policies representing tenant/purpose rules; include regression fixtures and golden tests.
- Embed OPA evaluation in gateway and service middleware; fail closed on policy evaluation errors.
- Emit structured audit logs and forward to SIEM with dashboards for denied decisions.

### Phase 4 — Break-Glass & Rollout (Week 4)
- Provision break-glass user in vault; automate rotation via scheduled job and record validations.
- Conduct dry-run incident exercising runbook and capture sign-offs from Security & SRE.
- Stage rollout by environment with canary tenant to monitor for regressions.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| ABAC policy modeling workshop | App Eng + Security | 2d | None |
| OIDC middleware implementation | App Eng | 4d | Workshop |
| SCIM worker scaffolding | App Eng | 3d | Secrets provisioned |
| Rego policy authoring & tests | App Eng | 5d | Worker scaffolding |
| Audit pipeline integration | App Eng + SRE | 2d | Rego decisions |
| Break-glass runbook & automation | App Eng + Security | 3d | Audit pipeline |

## Data Model Changes
- New `tenant_roles` table keyed by `{identity_id, tenant_id}` with role + purpose attributes.
- Extend audit log schema to include `purpose` and `decision_source` fields.

## Testing Strategy
### Unit Tests
- Rego unit tests covering allow/deny vectors for each tenant and purpose combination.
- SCIM payload parser and mapper tests verifying idempotency and validation failures.

### Integration / Contract Tests
- SCIM webhook contract tests using recorded fixtures to ensure updates visible in <60s.
- OIDC token exchange tests verifying JWKS rotation and claim derivation.

### End-to-End Tests
- Synthetic login flows validating access with/without purpose set; verify denied paths produce audit records.
- Chaos test toggling policy bundle to ensure fail-closed behavior.

## Observability & Operations
- Metrics: `auth_login_success`, `auth_login_failure`, `scim_sync_latency`, `opa_denied_total`.
- Dashboards: Tenant-level access denials, SCIM lag, break-glass usage.
- Alerts: High denied rate (>5% in 5m), SCIM lag >60s, break-glass credential age >14d.

## Security & Compliance
- Secrets stored in External Secrets; rotate OIDC client secret quarterly.
- Maintain SCIM signing key fingerprint list with rotation procedure.
- Ensure audit logs comply with retention policy and are access-controlled.

## Documentation & Enablement
- Update authentication guide with OIDC flows, purpose selection UI, and troubleshooting steps.
- Publish break-glass rotation runbook and review with on-call.
- Provide ABAC policy overview to stakeholders.

## Operational Readiness Checklist
- [ ] Security sign-off on ABAC matrix and Rego policies.
- [ ] SRE validation of monitoring dashboards and alerts.
- [ ] Break-glass drill completed with recorded evidence.
- [ ] Runbook links added to on-call handbook.

## Dependencies
- Policy Pack v0 available in COS policy repository.

## Risks & Mitigations
- **Role drift**: Automated contract tests and nightly reconciliation job.
- **Token misuse**: Enforce short-lived tokens and refresh with proof-of-possession (DPoP) where feasible.

## Acceptance Criteria
- SCIM role changes propagate to COS within ≤60 seconds for console and API.
- Cross-tenant access attempts are denied with OPA audit records containing `{sub, tenant, purpose, decision}`.
- Audit logs shipped to SIEM within 2 minutes, accessible in dashboards.
- Break-glass rotation runbook executed and signed by Security.
