# ATG Performance & Cost Budgets

## Readiness & Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`

## Targets

- **Daily equilibrium run (v1 target):** ≤ 4 hours for “N million nodes” in PRD framing.
- **CI budget (v0/v1 dev):** 100k nodes synthetic ESG, 1k simulated rollouts → ≤ 10 min on CI runner (baseline measurement required before enforcement).

## Profiler Output

- Script: `scripts/monitoring/adaptive-tradecraft-graph-profiler.ts`
- Output: `out/perf.metrics.json` (no timestamps)

## Measurement Discipline

- Deterministic input fixtures.
- Track memory, runtime, and rollouts/sec.
- Record budget deltas in evidence bundle for PR validation.

