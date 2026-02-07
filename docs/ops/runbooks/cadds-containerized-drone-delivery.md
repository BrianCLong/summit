# Runbook — CADDS Solicitation Intake

Reference: [Summit Readiness Assertion](../../SUMMIT_READINESS_ASSERTION.md).

## Purpose

Generate deterministic, attributable CADDS solicitation artifacts for requirements, risk, and
interop mapping with fixture-based inputs.

## Preconditions

- Local fixtures are present (e.g., `tests/fixtures/cadds.html`).
- Network fetching remains **OFF** by default and must stay feature-flagged.

## Execution (Fixture-First)

1. Generate artifacts using the solicitation ingest command:
   - `summit ingest solicitation --url <DIU CADDS URL> --fixture tests/fixtures/cadds.html --out artifacts/cadds-containerized-drone-delivery`
2. Verify outputs:
   - `requirements.json`, `risk_register.json`, `interop_matrix.json`, and `stamp.json` exist.
3. Confirm no orphan requirements (each requirement has evidence IDs).

## Drift Handling

- If a drift detector reports a hash change, open a GitHub issue titled:
  **“Solicitation drift detected: CADDS”**
- Include old/new hashes and a link to regenerate fixtures.

## Rollback

- Revert the artifacts directory to the last known-good commit.
- Retain the drift issue for audit tracking.
