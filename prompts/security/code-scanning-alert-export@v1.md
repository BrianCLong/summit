# Prompt: Code Scanning Alert Export & Triage Enablement (v1)

## Objective
Provide a governed, repeatable mechanism to export GitHub Code Scanning alerts and document the
triage workflow to unblock remediation and compliance evidence collection.

## Scope
- Add tooling that exports Code Scanning alerts via GitHub API to a local artifact.
- Update security documentation to explain the export and triage steps.
- Update roadmap status metadata to reflect the governance update.
- Produce a task spec that records the declared scope and verification tiers.

## Constraints
- Do not add new runtime dependencies.
- Keep changes limited to the declared paths.
- Ensure output artifacts contain no secrets (token never persisted).
- Follow repository governance requirements (prompt registry + task spec).

## Deliverables
- Script: `scripts/security/export-code-scanning-alerts.mjs`
- Docs updates: `docs/security/scanning-tools.md`, `docs/security/SECURITY_SWEEP_REPORT.md`
- Roadmap update: `docs/roadmap/STATUS.json`
- Task spec: `agents/examples/code-scanning-alert-export@v1.json`

## Verification
- Run `node scripts/check-boundaries.cjs`.
- Document any skipped tests and rationale.
