# Prompt: Jest Entities Override (v1)

## Objective
Restore Jest route smoke test execution by pinning the `entities` dependency to a compatible version that preserves `entities/decode` for parse5 consumers, while recording the change in governance artifacts.

## Scope
- Update `package.json` with a pnpm override for `entities`.
- Regenerate `pnpm-lock.yaml` via `pnpm install`.
- Update `docs/roadmap/STATUS.json` with a concise revision note.
- Record the decision in `packages/decision-ledger/decision_ledger.json`.

## Constraints
- Keep the change scoped to dependency pinning and governance artifacts only.
- Do not modify application behavior beyond dependency resolution.
- Ensure rollback is a simple revert of the commit.

## Required Verification
- Run `pnpm -C client test -- routeSmokeTests.test.tsx`.
- Run `node scripts/check-boundaries.cjs`.
