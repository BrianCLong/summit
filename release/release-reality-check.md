# Release Reality Check (Step 1)

## Evidence (UEF)

- Workspace inventory source: `release/package-inventory.json` (generated from `pnpm-workspace.yaml` + `package.json` files).
- Required checks discovery source: `required_checks.todo.md`.
- Release/CI scripts source: root `package.json`.
- Security/IAM posture sources: `SECURITY.md`, `SECURITY/security-control-library.md`, and `SECURITY/threat-models/export-pipeline.md`.

## A) Package inventory

- Full inventory is captured in `release/package-inventory.json`.
- Counts (derived from inventory):
  - Total packages: 706
  - Private packages: 61
  - Public packages: 645
  - Missing `publishConfig`: 704
  - Scopes observed: `@intelgraph` (621), `@summit` (29), `@maestro` (8), `@switchboard` (1), `@libs` (1), `@safety` (1), `@summi7` (1), plus 43 unscoped packages.

## B) Current blockers (publish/release)

- `publishConfig` is missing from nearly all workspace packages, which blocks consistent `npm publish` behavior, provenance settings, and scoped registry targeting.
- Large share of packages are unscoped or use scopes beyond `@intelgraph` (e.g., `@summit`, `@maestro`, `@summi7`), implying registry/org alignment must be confirmed for publishing authority.
- Root package is marked `private: true`, so top-level publish and release behavior depends on per-package configuration.

## C) CI status (repo-defined expectations)

- Required status check names remain undiscovered; `required_checks.todo.md` instructs branch protection discovery and mapping to verifiers.
- CI scripts are defined in root `package.json`, including security, provenance, and evidence gates that must be green for release readiness.

## D) Security/IAM posture references

- MFA/strong authentication is required for privileged actions (per security control library and threat-model references).
- Threat models specify MFA for sensitive operations and key access (export pipeline + data provenance threat models).

## Notes on release unblock scope

- Publish unblock, CI stabilization, Docker/MCP work, and evidence generation must align with governance rules referenced in this repo (see root AGENTS instructions).
