# Architecture Assumptions

## Summit Context
Summit is a platform/repo that ingests intelligence items, generates structured assessments, runs detectors/evals, and enforces CI evidence gates for "ship-ready" threat intelligence outputs.

## System Design Snapshot
* **Ingest**: `intel/items/*.md` + `intel/items/*.json` (structured extract)
* **Normalize**: `intel/schema/*.json` JSON Schemas
* **Detect/Evaluate**: `intel/detectors/*` + `intel/evals/*`
* **Evidence**: `evidence/<EVID>/report.json|metrics.json|stamp.json` + `evidence/index.json`
* **CI gates**: `ci/gates/*` verifying schemas, evidence completeness, and deny-by-default fixtures.

## Data Model
* `IntelItem` (id, date, sources[], claims[], tags[], actors[], ttps[], confidence)
* `LeakSignal` (market, timestamp_window, odds_delta, volume_delta, plausibility, notes)
* `IOEvent` (narrative_frames[], contradiction_pairs[], channels[], suspected_infra)
* `MalwareCampaign` (lures[], delivery[], c2_channels[], config_hosts[], indicators[])

## Control Points
* **Evidence completeness gate**: no merge without `report.json + metrics.json + stamp.json + evidence/index.json`.
* **Schema gate**: all structured outputs must validate against JSON Schema.
* **Deny-by-default fixtures**: negative tests that must fail when evidence missing/invalid.
* **Supply-chain delta gate**: per-PR dependency delta doc + CI check to ensure declared deltas.

## Evidence Rules
* **Timestamps**: Only allowed in `stamp.json`.
* **Determinism**: Reports and metrics must be deterministic.
* **Format**: All evidence artifacts must be valid JSON and adhere to strict schemas.
