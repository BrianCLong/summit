---
title: Runbook – sitrep-2026-02-06-io-espionage
summary: Operational steps for ingestion, replay, evidence verification, and alert triage.
owner: intelgraph
version: v1
lastUpdated: 2026-02-06
---

# Runbook – sitrep-2026-02-06-io-espionage

## Purpose
Run, replay, and validate the sitrep watchboard pipeline while preserving deterministic evidence
artifacts and safe attribution language.

## Preconditions
- Feature flag OFF by default; enable only in approved environment.
- Offline fixtures available (no-network CI).

## Run ingestion locally
1. Ensure fixtures are present under `tests/fixtures/sitrep-2026-02-06/`.
2. Run the ingestion command defined by the connector pipeline.
3. Confirm outputs:
   - `artifacts/evidence/EVID-20260206-0001/report.json`
   - `artifacts/evidence/EVID-20260206-0001/metrics.json`
   - `artifacts/evidence/EVID-20260206-0001/stamp.json`

## Replay fixtures
1. Clear prior `artifacts/evidence/` output for the run ID.
2. Execute fixture replay script.
3. Compare hashes to the baseline evidence manifest.

## Validate evidence hashes
- Run determinism gate to confirm stable hashes.
- If drift detected, halt and open an evidence incident.

## Alert triage
- Impersonating-domain spike: check cloned-outlet signals and linked claims.
- Sexual smear narrative: verify claim references and “source reports” language.
- Espionage arrest cluster: validate entity resolution for Greece/China ties.

## Rollback
- Disable feature flag.
- Remove generated artifacts from downstream consumers.
- Re-run with known-good fixtures.

## Evidence-first reporting
Attach evidence bundles before narrative summaries in all incident notes.
