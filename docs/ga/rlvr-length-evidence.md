# RLVR Length-Bias Evidence Pack (LUSPO-2602-05261)

This document anchors the GA evidence pack for RLVR length-bias monitoring derived from the LUSPO item. It aligns with the Summit Readiness Assertion and enforces deterministic, deny-by-default evidence handling. See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness posture alignment.

## Evidence IDs

- `EVD-LUSPO-2602-05261-LEN-001`
- `EVD-LUSPO-2602-05261-BIAS-002`
- `EVD-LUSPO-2602-05261-GATE-003`

## Evidence Pack Files

- `evidence/LUSPO-2602-05261/report.json`
- `evidence/LUSPO-2602-05261/metrics.json`
- `evidence/LUSPO-2602-05261/stamp.json`
- `evidence/index.json` (index mapping)

## Determinism Contract

- Only `stamp.json` may contain timestamps.
- All other evidence files must be byte-stable across reruns.
- Stable key ordering and fixed rounding are mandatory for computed metrics.

## Deny-by-Default Gate Guidance

- Missing required fields must fail gates.
- Positive and negative fixtures are mandatory before any enablement.
- Gate thresholds must be explicit in analyzer outputs before CI verification is enabled.

## Never-Log Fields (Privacy Guardrail)

- Never store raw prompts, raw completions, or unredacted token payloads in evidence.
- Prefer hashed `prompt_id` values or redacted excerpts only.
- Any exception requires a governed exception record and security council review.

## Schema References

The evidence pack uses the existing schemas in `schemas/evidence/`:

- `schemas/evidence/report.schema.json`
- `schemas/evidence/metrics.schema.json`
- `schemas/evidence/stamp.schema.json`
- `schemas/evidence/index.schema.json`

## Status

Scaffolding is complete. Analyzer, fixtures, and CI gate wiring are deferred pending the next PR tranche.
