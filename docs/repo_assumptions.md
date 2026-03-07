# Repo Reality Check

## Verified vs Assumed

| Aspect | Verified | Assumed |
|---|---|---|
| Package Manager | pnpm | |
| Bootstrap | `./scripts/golden-path.sh` | |
| Governance Policy | `docs/ci/REQUIRED_CHECKS_POLICY.yml` | |
| Reconciler | `./scripts/release/reconcile_branch_protection.sh` | |
| Top-level dirs | `ci`, `cli`, `client` (via `packages/`), `server` | |
| Governor Package Layout | | `packages/governor-*` |
| CLI Entrypoint | | `cli/governor/index.ts` |
| JSON Schema utility | | Standard zod or built-in validation |

## Must-not-touch
- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- `./scripts/release/reconcile_branch_protection.sh`
- existing branch-protection drift workflows
- release/versioning scripts
- current GA gate definitions
