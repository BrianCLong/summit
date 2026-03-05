# Partner enablement kit v1

## Purpose
Provide a single, governed partner guide for onboarding, IdP setup, policy profiles, evidence
packs, billing basics, and troubleshooting links. This kit is versioned and aligned with the
Summit Readiness Assertion and governance canon to keep partner onboarding deterministic and
auditable.

## Governance alignment
- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution + Meta-Governance: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- Agent mandates: `docs/governance/AGENT_MANDATES.md`
- Evidence bundle standard: `docs/evidence-bundle-spec.md`

## Onboarding checklist
1. **Partner account intake**
   - Record primary contacts, escalation path, and target environments.
   - Confirm tenant name, region, and data residency requirements.
2. **Tenant provisioning**
   - Create tenant with baseline policy profile and least-privilege defaults.
   - Confirm RBAC/ABAC role mapping and required attributes.
3. **Identity provider (IdP) setup**
   - Configure OIDC with required claims and metadata; confirm SSO handshake.
   - Optionally enable SCIM per `docs/identity-oidc-scim-contracts.md`.
4. **Access Requests v1 readiness**
   - Validate access request routing, approvers, and decision SLAs.
   - Ensure receipts appear in the Timeline and audit exports.
5. **Integrations readiness**
   - Validate Slack/PagerDuty (or webhook) signing, retries, and DLQ runbooks.
6. **Evidence pack validation**
   - Confirm evidence artifacts are generated and stored per policy.
7. **Billing profile**
   - Confirm plan, billable events, and export cadence.

## IdP setup (OIDC + SCIM)
- Required claims: `sub`, `email`, `groups`, `tenant_id`, `role`.
- Token signing and JWKS rotation must follow `docs/ENV_VARS.md` and
  `docs/identity-oidc-scim-contracts.md`.
- SCIM provisioning uses the profile in `docs/identity-oidc-scim-contracts.md` and should be
  validated in staging before production.

## Policy profiles (starter)
- **Standard partner profile**: baseline least-privilege access with explicit approvals.
- **Elevated operator profile**: gated by Access Requests approvals with TTL grants.
- **Emergency response profile**: break-glass policy per `docs/runbooks/break-glass-runbook.md`.

Policy changes must remain policy-as-code and aligned with
`docs/governance/CONSTITUTION.md`.

## Evidence packs
- Evidence bundle spec: `docs/evidence-bundle-spec.md`.
- Recommended evidence artifacts for partner onboarding:
  - Access request receipts and grant/revoke records.
  - Integration delivery receipts (Slack/PagerDuty/webhook).
  - SSO audit evidence and SCIM provisioning logs (if enabled).
  - Timeline exports for approvals and TTL expirations.

## Billing basics
- Billable events: `docs/billing/BILLABLE_EVENTS.md`.
- Plans and entitlements: `docs/billing/plans.md`.
- Billing exports: `docs/billing/billing-exports-and-webhooks.md`.

## In-app troubleshooting links
Expose these links in product help surfaces to reduce support load:

| Issue | In-app help target | Notes |
| --- | --- | --- |
| Access denied | `docs/runbooks/approvals-service.md` | Includes approval routing and receipts. |
| Slow queries | `docs/runbooks/query-latency-spike.md` | Includes correlation ID and latency triage. |
| Integration failures | `docs/runbooks/integration_chain_runbook.md` | Includes retries and DLQ handling. |
| DLQ growth | `docs/runbooks/dlq-growth.md` | Includes remediation and alert tuning. |
| Rate limiting | `docs/runbooks/api-rate-limit-exceeded.md` | Includes tenant-level mitigation. |

Recommended dashboards to link:
- `docs/OBSERVABILITY_SLOs.md`
- `docs/SLO.md`
- `docs/OBSERVABILITY.md`

## Demo tenant reset (policy-gated)
- Requires dual-control approval in production and a reset receipt in the Timeline.
- Reset scope must be declared and audited before execution.
- Implementation wiring is **Deferred pending** the product reset workflow hook.

## Support escalation
- Tiering and escalation guidance: `docs/SUPPORT_PLAN.md` and
  `docs/runbooks/support-l1.md` / `docs/runbooks/support-l2.md`.
- Incident comms templates: `docs/runbooks/communication-templates.md`.
