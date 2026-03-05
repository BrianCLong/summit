# White-Label Admin (Tenant Overlays + RBAC-lite)

## Purpose

Provide a minimal, governed admin layer for SMBs and partners while preserving the single core platform.

## Tenant Overlays

- Branding: logos, colors, domain, and UI messaging.
- Policy overlays: tenant-specific allow/deny rules.
- Skill catalogs: approved skill list per tenant.

## RBAC-lite

- **Roles**: Owner, Admin, Member, Viewer.
- **Controls**: manage policies, approve workflows, view receipts.
- **Constraints**: no cross-tenant access; all actions logged in receipts.

## Admin Console (Lite)

- Trust dashboard summary
- Policy editor (guarded templates only)
- Workflow approvals
- Evidence export controls

## Security Invariants

- Tenant boundary enforced at runtime and export.
- No ambient credentials; scoped tokens only.
- Admin actions emit receipts and policy decisions.

## Evidence Exports

- Tenant-scoped bundles only.
- Redaction default for any external sharing.
- Export approvals recorded in receipts.
