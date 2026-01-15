# PR Stack Plan

## Status

- **#15380** — Superseded. See [docs/prs/15380-disposition.md](prs/15380-disposition.md) for disposition evidence and deferred follow-ups.

## Superseding PRs

- Dependency monitoring baseline (to be opened): establishes CI-visible SCA baseline and evidence artifacts.
- Onboarding/docs clarity (to be opened): refreshes contributor guidance with GA guardrails and stack expectations.
- Perf/k6 baseline (to be opened): lands minimal k6 journey script with CI thresholds and stored output artifacts.
- Packages/memory decision (if applicable): documents package layout vs memory footprint decision with profiling evidence.
- #15382 (observability): promote to non-draft with deterministic promtool/JSON validation in CI once predecessors land.
- #15381 (storage/DR): follow observability; ensure safety/idempotency verifiers are wired before merge.

## Merge Order

1. Dependency monitoring baseline
2. Onboarding/docs clarity
3. Perf/k6 baseline
4. Packages/memory decision (if required)
5. #15382 observability hardening
6. #15381 storage/DR safety

## Rationale

#15380 bundled changes without clear ownership lanes. Superseding work splits concerns into dedicated PRs, keeping supply-chain, documentation, performance baselining, and platform safety isolated so each lane can be reviewed and merged independently.

## Verification

- No unique code or config changes remain from #15380; supply-chain artifacts were reverted and all follow-ups are tracked above.
