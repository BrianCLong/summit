# Narrative Intelligence & Resilience (Defensive-First)

Summit Narrative Intel is a defensive capability layer focused on sensing, measurement, attribution
support, and resilience. It is **deny-by-default** for any influence deployment behavior and
stores only metadata pointers for sensitive artifacts.

## Scope

- Narrative cluster detection (claim/frame/cluster level).
- Coordination signal attribution support (timing, reuse, propagation shape).
- Provenance metadata capture for synthetic media assessment.
- Evidence-first reporting with deterministic, auditable outputs.

## Safety Posture

- **Defensive-first**: detection, measurement, attribution support, resilience, transparency.
- **Deny-by-default**: no campaign deployment, targeting, persona generation, or amplification.
- **Metadata-only** for sensitive artifacts: store hashes and URLs, not raw content.

## Evidence Bundle (NARDOM)

Evidence bundles must include report, metrics, stamp, and index files. Timestamps are isolated to
`stamp.json`.

- Evidence ID format: `EVD-NARDOM-<AREA>-<NNN>`
- Templates live in `evidence/narrative_intel/`.
- Schemas live in `evidence/schemas/`.

## Quick Start (Template Validation)

1. Update `evidence/narrative_intel/report.json` and `metrics.json` with run outputs.
2. Update `evidence/narrative_intel/stamp.json` with the timestamp for the run.
3. Register artifacts in `evidence/index.json` under the `map` field.
4. Run `python3 tools/ci/verify_evidence.py`.

## Governance Alignment

- Evidence bundle requirements are enforced by CI gates.
- All outputs must be reproducible and attributable to input artifacts.
- Feature flags default to OFF for any resilience assistant capabilities.
