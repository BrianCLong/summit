# Benchmark B1: Evidence Completeness & Freshness (ECF)

## Summit Readiness Assertion
This benchmark aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Definitions
- **Completeness**: % of releases with required evidence set (SBOM + provenance + signatures).
- **Freshness**: median time from build completion to evidence verification.
- **Drift Rate**: policy digest changes vs evidence compliance status.

## Thresholds (Initial)
- Completeness ≥ 95%.
- Freshness median ≤ 20 minutes.
- Drift Rate ≤ 2% per release window.

## Outputs
- `benchmarks/ecf/metrics.json`
- `benchmarks/ecf/report.json`
