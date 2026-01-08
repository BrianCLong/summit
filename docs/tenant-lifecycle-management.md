# Tenant & Lifecycle Management

This document defines the end-to-end lifecycle model, onboarding and configuration flows, and offboarding/portability guarantees for CompanyOS tenants and organizations.

## Tenant Lifecycle State Machine

### States

- **Prospect**: Record exists for sales/marketing qualification only; no resources provisioned.
- **Trial**: Isolated sandbox with time-limited access and constrained quotas.
- **Active**: Fully provisioned tenant with contracted SLAs.
- **Suspended**: Access temporarily blocked due to billing, compliance, or security holds; data retained.
- **Read-only**: Access limited to viewing/exporting data; no mutations.
- **Terminated**: Tenant is deprovisioned; data pending deletion per retention policy.

### Allowed Transitions & Required Checks

| From                    | To         | Required Checks/Signals                                                                                                                                                           |
| ----------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prospect                | Trial      | Identity verified (email/domain or IdP ownership); DPA/ToS accepted; region/data residency selected; quotas applied; sandbox namespace provisioned.                               |
| Prospect                | Active     | Contract executed; billing account valid; region/residency chosen; IdP configured or default auth enabled; baseline policies applied; production namespace provisioned.           |
| Trial                   | Active     | Acceptance of production ToS + security baseline; billing verified; migration of selected trial data to prod namespace; feature flags aligned with plan; observability hooks on.  |
| Trial                   | Terminated | Trial expired or rejected; confirm no open legal hold; soft-delete clock started.                                                                                                 |
| Active                  | Suspended  | Trigger from billing delinquency, security incident, or compliance hold; security triage completed; notification sent; preservation hold applied (no deletion during suspension). |
| Active                  | Read-only  | Admin request or downgrade; billing current; freeze writes; API tokens scoped read-only; backups intact.                                                                          |
| Suspended               | Active     | Issue resolved (payment, security); re-verify ownership; audit of changes during suspension; resume writes after integrity check.                                                 |
| Read-only               | Active     | Admin request; confirm no legal hold preventing writes; unlock tokens/roles.                                                                                                      |
| Any (except Terminated) | Terminated | Formal termination order; export offered/accepted or explicitly declined; legal hold reviewed; retention timers started; access revoked.                                          |

### State Effects

- **Access**:
  - Prospect: No console/API access.
  - Trial: Limited-time console/API with capped resources; support via community tier.
  - Active: Full access per plan; SSO enforced if configured; support per contract.
  - Suspended: Console/API login allowed only for billing/security page; no data access except designated billing/security contacts.
  - Read-only: Console/API limited to GET/export; background jobs paused except backups.
  - Terminated: All access revoked; data only available via pre-delivered export until soft-delete ends.
- **Data Retention**:
  - Prospect: No customer data stored.
  - Trial: Data retained for 30 days post-expiry unless converted; then soft-delete window.
  - Active: Retention per contract; backups per RPO/RTO.
  - Suspended: Data preserved; immutability lock optional for incident response.
  - Read-only: Data retained; write paths blocked.
  - Terminated: Soft-delete (default 30 days, configurable per region/legal); hard-delete after timer unless legal hold.
- **Billing Signals**:
  - Prospect: No billing events.
  - Trial: Track usage vs. trial quotas; send conversion nudges.
  - Active: Normal billing; emit downgrade/upgrade events.
  - Suspended: Emit "billing_hold" or "security_hold" signals; stop usage-based accrual if contractually allowed; fixed fees may continue.
  - Read-only: Bill at downgraded/read-only rate; usage meters capped at zero writes.
  - Terminated: Final invoice generated; stop accrual; record termination reason codes.

## Onboarding & Configuration Flows

### Required Captures

- **Regions & Data Residency**: Primary region, backup/DR region, residency constraints, cross-border transfer approvals.
- **Identity Providers**: IdP metadata (OIDC/SAML), SCIM provisioning, MFA policy, just-in-time (JIT) settings.
- **Policies**: RBAC model, data access policies (PII handling, retention), audit log retention, encryption requirements, API allowlists, webhook endpoints.
- **Operational Contacts**: Security, billing, technical admins; escalation paths.
- **Plan & Feature Set**: Edition, add-ons, usage caps, compliance packs (HIPAA, SOC2, GDPR), observability sinks.

### Default vs. Advanced Paths

- **Default (Fast Start)**: Single region, CompanyOS IdP or basic SSO, default retention (365 days), standard RBAC roles, recommended alerts, default feature bundle enabled progressively based on risk (no external webhooks until verified domain).
- **Advanced (Regulated/Enterprise)**: Multi-region with residency pinning, customer-managed keys, mandatory SSO + SCIM, custom retention, private connectivity (IP allowlists/VPN/PrivateLink), fine-grained RBAC, change-management approvals, dedicated audit export.

### Progressive Feature Enablement

- Gate high-risk features (webhooks, cross-region replication, AI-assisted actions) behind flags tied to completion of security checks (domain verification, DLP policy set, admin approval).
- Use staged rollouts: sandbox → limited cohort → full tenant; capture success metrics and rollback flags.
- Emit lifecycle events (`tenant.feature_enabled`, `tenant.policy_updated`) to audit stream for traceability.

## Offboarding & Portability

### Data Export

- **Formats**: Structured JSON/CSV for records; Parquet for large datasets; signed NDJSON for event streams; S3-compatible bundle with manifests and checksums; encrypted with customer key when provided.
- **APIs/SLAs**: Self-service export API with async job + presigned URLs; SLA: export available within 24 hours for ≤1TB; resumable downloads; integrity via SHA-256 manifest.

### Grace Periods & Deletion

- **Soft-Delete Window**: Default 30 days (configurable per contract/region) after termination or trial expiry; backups retained but isolated; access blocked.
- **Hard-Delete**: After window, primary storage and backups purged; cryptographic erasure for envelope keys; verification report generated and logged.
- **Legal Holds**: Pause deletion timers; mark records as retained; require authorized release before resuming.

### Evidence Retention vs. Purge

- **Retained**: Audit logs of administrative actions, lifecycle events, access to exports, deletion attestations, billing records, and configuration snapshots necessary for compliance and dispute resolution.
- **Purged**: Customer content/data, derived analytics containing customer data, cached embeddings/vectors, temporary processing artifacts, session tokens, and runtime secrets.
- **Rationale**: Retained evidence supports regulatory obligations (SOX/GDPR accountability, incident forensics) while purging customer content meets data minimization and privacy requirements.

## Artifacts

### Tenant Lifecycle State Machine (Text)

```
Prospect -> Trial (verify identity, accept ToS, choose region, apply quotas)
Prospect -> Active (contract/billing, residency, IdP or default auth, provision prod)
Trial -> Active (accept production terms, verify billing, migrate selected data, set flags)
Trial -> Terminated (expiry/no conversion; start soft-delete)
Active -> Suspended (billing/security hold; preserve data; notify)
Active -> Read-only (downgrade/admin request; freeze writes)
Suspended -> Active (issue resolved; integrity check; resume writes)
Read-only -> Active (unlock on request)
Any non-terminated -> Terminated (formal termination; export offered; start timers)
```

### Example Onboarding Checklist

- Capture: region/residency, IdP metadata, SCIM/JIT, RBAC roles, contacts, plan/add-ons, retention policy, API allowlists/webhook domains, observability sinks.
- Provision: sandbox/prod namespaces, encryption keys (default or CMK), backups, monitoring dashboards, default alerts, billing account.
- Validate: domain verification, SSO/MFA test, DLP/PII policies, rate limits/quotas, webhook delivery test, export job smoke test.
- Approve & Activate: admin attestation, record in audit log, emit `tenant.activated` event, handoff to CSM.

### Offboarding Runbook Outline

1. **Initiate**: Receive authorized termination request; verify identity/role; confirm legal hold status; record ticket.
2. **Prepare Export**: Offer/export data in agreed format; deliver checksums; capture download confirmation.
3. **Access Controls**: Revoke/disable tokens, SSO groups, webhooks; set tenant to read-only then revoke after export.
4. **Soft-Delete Timer**: Start retention clock; mark backups; enable tamper-evident logging.
5. **Deletion Execution**: After window (or with waiver), perform primary deletion, key erasure, backup purge; record job IDs.
6. **Verification & Attestation**: Generate deletion report with timestamps, data classes removed, evidence links; dual-approver sign-off; emit `tenant.terminated` event.
7. **Closeout**: Final invoice/credits, notify contacts, archive configuration snapshot and audit logs per retention.
