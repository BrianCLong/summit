# Evidence-Trail Peek Overlay + API Prompt

## Objective

Deliver the Evidence-Trail Peek overlay and associated read-only APIs for Summit answers and graph nodes.

## Requirements

1. Add read-only endpoints:
   - `GET /api/evidence-index`
   - `GET /api/evidence-top`
   - `GET /api/claim-ranking`
2. Enforce server-side ranking:
   - Cap results to three claims.
   - Require at least one deterministic badge (`SBOM`, `Provenance`, `Test`, `Attestation`).
3. Implement UI overlay with:
   - Provenance timeline
   - Top-N artifacts
   - Answer-Surface Minimizer (3 claims with deterministic badges)
4. Gate with `features.evidenceTrailPeek` (default OFF).
5. Add telemetry events (runtime only, no PII, no raw evidence bodies).
6. Add Cypress E2E validation for minimized view.
7. Update standards, data-handling, and runbook docs.
8. Update `docs/roadmap/STATUS.json` and DecisionLedger entry.

## Guardrails

- No new data model or persistent timestamps.
- No write operations; endpoints are read-only.
- Reuse existing `evidence_id` joins and existing evidence endpoints for badge links.

## Deliverables

- UI component + mount points
- API routes + contract tests
- Telemetry helper
- E2E test
- Documentation updates
