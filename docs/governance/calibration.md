# Calibration Governance (Tool-Aware Confidence)

This policy makes tool-type-specific calibration a governed, runtime-first signal.
Calibration is not post-hoc; it is enforced at every plan step and recorded as an
artifact for CI evidence.

## Summit Readiness Assertion

All calibration changes align to `docs/SUMMIT_READINESS_ASSERTION.md` and the
governance framework defined in `docs/governance/CONSTITUTION.md`.

## Tool-Type Confidence Contract

Every step that emits confidence must publish a `ConfidenceReport` with the
following core fields:

- `p_correct` (0–1)
- `tool_types_used[]`: `EVIDENCE`, `VERIFICATION`, `HYBRID`, `HUMAN`
- `noise_signals`: evidence noise summary (agreement/entropy/recency/provenance)
- `verification_signals`: explicit failures (exec, parse, assertion, test)
- `contradiction_count`
- `provenance_coverage`
- `risk_tier`
- `notes[]`
- `timestamp`

## Evidence-Noise Model

Evidence tools are inherently noisy. The runtime model scores:

- `source_agreement_score`
- `retrieval_entropy`
- `contradiction_count`
- `provenance_coverage`
- `recency_risk`

When evidence noise is high **and** no verification signals are present, confidence
is capped (default `<= 0.65`) with an explicit note explaining why.

## Verification Signals

Verification tools emit deterministic signals that reduce overconfidence risk:

- `exec_error`
- `parse_error`
- `assertion_fail`
- `test_fail`

These are aggregated per step and recorded in the confidence report.

## CI Evidence

A deterministic calibration smoke suite runs in CI and emits:

- `artifacts/calibration/calibration_report.json`
- `artifacts/calibration/calibration_report.md`

The smoke suite validates schema integrity and evidence-cap behavior to prevent
regressions.

## Update Path

Calibration parameters are stored in `packages/maestro-core/src/confidence/calibration-params.json`.
Updates must include evidence artifacts and regression checks in CI.
