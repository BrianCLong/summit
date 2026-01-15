# Support impersonation + tenant health bundle prompt

## Intent

Implement policy-gated support impersonation, provenance receipts, redacted tenant
health bundle export, and the corresponding UI/doc updates.

## Scope

- `server/src/services/support/`
- `server/src/policies/`
- `server/src/provenance/`
- `server/src/routes/support-center.ts`
- `apps/web/src/pages/HelpPage.tsx`
- `docs/support/`
- `docs/roadmap/STATUS.json`

## Required outcomes

- Allowlist policy rules and enforcement.
- Receipts for impersonation start/stop.
- Redacted tenant health bundle export.
- Support UI entry for operational actions.
- Documentation updates for redaction and evidence content.
