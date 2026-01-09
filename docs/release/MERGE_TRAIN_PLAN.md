# Merge Train Plan (Post-Gates)

**Owner**: Codex (Implementation & Engineering)
**Effective Date**: 2026-01-09
**Authority**:

- [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md)
- [GA Testing Strategy](../ga/TESTING-STRATEGY.md)
- [GA Legacy Mode](../ga/LEGACY-MODE.md)

## Mission

Turn the open PR surface area into a controlled merge train that preserves Golden Path Main
integrity, minimizes reviewer burden, and restores blocking gates without expanding the current
risk envelope.

## Deterministic Tooling

- **Node**: 20.x required for merge train validation.
- **pnpm**: 10.0.0 (per `package.json` `packageManager`).
- **Environment**: `CI=1 TZ=UTC` for all verification runs.

## Golden Path Commands

- `make bootstrap && make up && make smoke`
- `pnpm ga:verify` (or `pnpm ga:verify:server` when scoped)
- `pnpm lint && pnpm format:check && pnpm typecheck`

## Inventory Intake

**Inventory Source**: `pr-open.json` (repository snapshot).

**Snapshot Count**: 406 open PR records.

**Live GH Intake**: Deferred pending `gh` CLI availability. Merge train intake remains gated on a
validated GH export for the active branch protection state.

## Lane Definitions (A–F)

A) **Auto-merge safe**

- Dependabot, doc-only, CI metadata, lockfile-only when tests are unaffected.

B) **Mechanical low-risk**

- Lint/format, types, dependency bumps requiring trivial changes.

C) **Test/CI hardening**

- Runner fixes, flake quarantine, infra/test reliability improvements.

D) **Core runtime changes**

- Server/client behavior changes, schema changes, infra/runtime changes.

E) **Feature work**

- Net-new capabilities.

F) **Stale/blocked**

- Drafts inactive >30 days, missing owner response, failing checks without progress.

## Merge Order

1. Lane A
2. Lane B
3. Lane C
4. Lane D (only after A–C green)
5. Lane E (only after A–D green)
6. Lane F (comment + close only when governance allows)

## Stop Criteria

- Main fails Golden Path (`make smoke`) or `pnpm ga:verify`.
- Required checks are non-blocking without compensating guardrails.
- PRs in Lane D/E touch runtime without Tier A/B/C verification evidence.

## Failure Handling

1. **Pause the train** for the affected lane.
2. **Record the failure** in `docs/release/GA_DECISIONS.md` with scope and rollback criteria.
3. **Re-run deterministic verification** with `CI=1 TZ=UTC` and log outputs in the PR.
4. **Resume only when** the regression is resolved or the PR is deferred to Lane F.

## Compensating Guardrails (While CI Jobs Are Non-Blocking)

When CI test/governance/provenance jobs are `continue-on-error: true`, each PR in Lanes A–E must
capture the following in its verification plan and execution artifacts:

- `pnpm lint`
- `pnpm verify`
- `pnpm test:unit`
- `pnpm test:integration` (only if integration surfaces are touched)
- `make smoke` for any PR touching runtime, infra, deployment, or build surfaces

## Lane Assignment Protocol

1. Use `pr-open.json` to generate a current lane mapping.
2. Record the PR number, title, labels, and lane assignment in a tracking table.
3. Validate that each PR references its prompt hash in `prompts/registry.yaml`.
4. Confirm the PR metadata block in `.github/PULL_REQUEST_TEMPLATE.md` is complete.

## Merge Train Readiness Checklist

- [ ] Summit Readiness Assertion referenced in PR and release notes.
- [ ] Guardrail verification commands executed (when CI non-blocking).
- [ ] `docs/release/GA_DECISIONS.md` updated for any deferral or exception.
- [ ] Branch protection required checks aligned to GA policy.
