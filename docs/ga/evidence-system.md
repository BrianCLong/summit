# Evidence System (GA Hardening)

This document establishes the deterministic evidence bundle format and verification posture used to
prove agentic governance readiness. This aligns with the Summit Readiness Assertion and must remain
compatible with GA guardrails. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative
readiness posture.

## Deterministic Evidence Bundle

**Directory layout:** `evidence/runs/<run_id>/`

Required files:

- `report.json` — semantic summary (no timestamps)
- `metrics.json` — quantitative metrics (no timestamps)
- `stamp.json` — the *only* file that may contain timestamps
- `index.json` — maps evidence IDs to run files

**Determinism rule:** timestamp fields are confined to `stamp.json`. Any timestamp fields discovered
in other files are treated as build-blocking defects.

## Evidence IDs

Evidence IDs use the canonical slug `koreai-agentic`:

- `EVD-koreai-agentic-EVIDENCE-001` — schema validation and determinism proof

## Verification Gate

The evidence verifier is a deterministic script that enforces:

- Evidence ID presence in `evidence/index.json`
- Required files exist per evidence entry
- No timestamps outside `stamp.json`
- Run index references align with `stamp.json` values

## Rollback

Rollback is a revert of the evidence bundle and verification script changes, followed by removal of
any references in `evidence/index.json`.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Observability, Security
- **Threats Considered:** prompt injection via evidence payloads, tool abuse via unverified scripts,
  integrity drift from non-deterministic evidence
- **Mitigations:** deterministic schema checks, restricted timestamp surface, explicit evidence ID
  mapping in `evidence/index.json`, and CI verification gating
