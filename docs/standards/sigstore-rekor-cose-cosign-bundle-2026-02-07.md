# Sigstore Negative-Case Smoke Standard (2026-02-07)

**Item slug:** `sigstore-rekor-cose-cosign-bundle-2026-02-07`
**Authority:** Summit Readiness Assertion + Governance Constitution
**Status:** Active Standard

## Readiness Escalation

Summit remains **READY** for controlled deployment per the Summit Readiness Assertion. This standard is a governed exception guardrail that preserves the readiness posture by enforcing fail-closed behavior for Sigstore verification edge cases.

## Purpose

Codify deterministic, negative-case smoke tests that assert Summit’s CI supply-chain verification fails closed on:

1. Cosign bundle ↔ Rekor entry mismatch acceptance.
2. Rekor `cose/v0.0.1` malformed-entry 500 behavior.
3. Minimum safe versions for Cosign and Rekor.

## Import / Export

**Imports**
- Cosign bundle fixtures (redacted + hashed)
- Rekor API response fixtures (status + redacted payload summary)

**Exports**
- `summit.sigstore.smoke.v1` evidence JSON
- CI-required check status for protected branches

## Evidence Schema

All smoke runs must emit the deterministic report:

```json
{
  "schema": "summit.sigstore.smoke.v1",
  "results": [
    {
      "id": "SIGSTORE:EXAMPLE",
      "ok": false,
      "failure_mode": "COSIGN_MISMATCH_ACCEPTED",
      "details": {
        "failClosed": true,
        "caseHash": "..."
      }
    }
  ]
}
```

## Non-Goals

- Re-implementing Cosign/Rekor verification logic.
- Expanding beyond deterministic negative-case smoke coverage.

## Authority Alignment

This standard is aligned with:

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`

## Change Control

All modifications must:

- Preserve fail-closed behavior.
- Update evidence schema only via version bump.
- Provide rollback instructions in the runbook.
