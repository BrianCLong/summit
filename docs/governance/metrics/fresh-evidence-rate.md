# Fresh Evidence Rate (7d)

Control ID: GOV-EVID-004
Owner: Release Captain
Cadence: computed every 6 hours

## Objective
Ensure the main branch consistently produces audit-ready, verifiable evidence bundles that are not stale or replayed.

## Definition
Fresh Evidence Rate (7d) =
- Numerator: count of main-branch runs in the last 7 days where a signed/verified evidence bundle exists AND
  the attested `buildTime` is within 24 hours of the run completion time.
- Denominator: count of main-branch runs in the last 7 days expected to emit evidence (default expected = true).

## Thresholds
- Green: >= 95%
- Yellow: 85%–94%
- Red: < 85%

## Evidence
- docs/governance/metrics/fresh-evidence-rate.json (Shields endpoint)
- docs/governance/metrics/fresh-evidence-rate.raw.json (raw counts)

## Failure signals (common)
- Missing evidence artifact
- Verification failed (signature/provenance mismatch)
- buildTime too old (stale bundle or replay)
