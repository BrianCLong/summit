# Repo Assumptions Ledger

This ledger separates verified facts from intentionally constrained assumptions. Any assumption
must be resolved before feature flags or CI gates become enforced.

## Verified

| Item | Evidence |
| --- | --- |
| Node.js/TypeScript monorepo using pnpm workspaces | `package.json` declares `type: module`, `pnpm@10.0.0`, and `workspaces`. |
| Primary CLI entrypoints live under `src/cli/` | `src/cli/*` contains CLI command modules. |
| CI configuration is rooted in `.github/` workflows | `.github/workflows` and CI policy files are present. |
| Documentation lives under `docs/` with architecture subfolder | `docs/architecture/` exists and is populated. |

## Assumed (intentionally constrained)

| Item | Assumption State |
| --- | --- |
| Evidence artifact retention rules for architecture flows | Deferred pending review of evidence governance docs. |
| Required status checks for new CI gates | Deferred pending inspection of `required-checks.yml` and branch protections. |
| Must-not-touch files beyond lockfiles and release automation | Deferred pending compliance review and CODEOWNERS constraints. |

## Validation checklist

1. Confirm CLI entrypoint wiring for new commands in the primary CLI tool.
2. Locate evidence bundle conventions and storage location expectations.
3. Confirm CI check naming and required status checks.
4. Identify governance files that must align with new evidence IDs.
5. Confirm any generated artifact locations that are excluded from formatting or linting.

## Must-not-touch list (current)

- Lockfiles (`pnpm-lock.yaml`, `Cargo.lock`) and release automation outputs.
- Generated artifacts under `dist/`.
- Existing CI workflows unrelated to the flows capability.
