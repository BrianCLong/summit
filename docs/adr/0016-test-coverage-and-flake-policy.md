# 0016 - Coverage Gates & Flake Kill Program

## Status
Accepted

## Context
Flaky tests and uneven coverage in critical services (authz, search, privacy, drift-detection) cause regressions to slip through. We need enforceable gates and a consumer-driven contract suite.

## Decision
- Enforce ≥85% line coverage on critical modules; block merges if thresholds fall.
- Introduce consumer-driven contract tests between query-copilot and gateway.
- Track flakiness with auto-rerun (3x) and quarantine list; publish weekly report.
- Apply per-suite runtime budgets to prevent CI stalls.

## Alternatives Considered
1. **Ad-hoc coverage tracking**: lacks enforcement; rejected.
2. **Disable flaky tests**: hides issues; rejected.
3. **Pure unit tests only**: misses integration regressions; rejected.

## Consequences
- + Higher confidence in critical paths; + faster detection of breaking API changes.
- - Some overhead maintaining contracts and tuning timeouts.

## Validation
- CI targets `pnpm test:contracts` and coverage check with thresholds.
- Flake report artifact produced weekly; quarantined list maintained in repo.

## References
- `tests/contracts/query-copilot-gateway.md`
- `tests/FLAKE_REPORT.md`
