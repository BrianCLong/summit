# GA Evidence and Overrides

This file defines how GA readiness decisions are evidenced, stored, and overridden.

## Decision Flow

1. `scripts/run-ga-gate.ts` reads `release/ga-gate.yaml` and executes all automated checks.
2. Results are printed to stdout and written to `/artifacts/ga-gate-report.json` (uploaded by CI).
3. Manual checks are recorded here with links to supporting evidence (scan outputs, dashboards, approvals).
4. Governance leads review both automated results and manual evidence before approving GA.

## Evidence Locations

- **Automated gate output:** `/artifacts/ga-gate-report.json` (CI artifact).
- **Security scans:** attach latest secrets scan and dependency scan reports or waivers.
- **AuthN/AuthZ documentation:** `docs/security/AUTH_MATRIX.md`, `docs/security/service-to-service-auth.md`.
- **Observability dashboards:** `grafana/dashboards` definitions referenced by the gate.
- **Architecture and governance docs:** `docs/architecture`, `docs/governance`, and `docs/release/ga-gate.md`.

## Overrides

- Any failed automated check requires a tracking issue and explicit waiver recorded below.
- Waivers must include owner, expiration date, justification, and remediation plan.
- Overrides should be reviewed during the GA approval meeting and closed after remediation.

### Override Log

| Check ID                                 | Owner      | Tracking Issue | Expires      | Justification               | Evidence Link    |
| ---------------------------------------- | ---------- | -------------- | ------------ | --------------------------- | ---------------- |
| _example: dependency_vulnerability_scan_ | _Security_ | _#1234_        | _2026-01-01_ | _VEX accepted for CVE-XXXX_ | _link-to-report_ |
