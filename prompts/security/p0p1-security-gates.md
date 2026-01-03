# P0/P1 Security + Governance Gates

Purpose: deliver security/governance P0/P1 remediation with minimal scope overlap, including
safe dependency remediation, security CI gates, and evidence/compliance updates.

Scope:

- Dependency/vulnerability remediation for npm/pnpm artifacts.
- CI security gates (dependency review, CodeQL, secret scanning, policy-as-code checks).
- Evidence and compliance documentation updates for security gates.
- Readiness assertion updates tied to governance artifacts.

Constraints:

- Keep changes minimal and PR-ready; avoid broad refactors.
- Do not add new product features or UI refactors.
- Prefer patch/minor upgrades; avoid major upgrades unless required to clear P0 findings.
- Document evidence sources and verification commands.

Outputs:

- Updated dependency manifests/lockfiles as needed.
- Security workflows hardened or added under `.github/workflows/`.
- Evidence index and remediation ledger entries.
- Verification commands for auditability.
