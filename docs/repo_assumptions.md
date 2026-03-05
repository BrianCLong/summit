# Repo Reality Check — HF 2602.20093 Subsumption Lane

## Verified

- Repository contains a root `AGENTS.md` with governance and execution invariants requiring `docs/roadmap/STATUS.json` inspection and update per implementation PR.
- `docs/roadmap/STATUS.json` exists and tracks in-progress initiatives.
- `docs/` is present and suitable for planning, standards, and runbook documentation.

## Assumed

- Future ITEM implementation files will live under paths such as `summit/items/`, `summit/pipelines/`, and `tests/items/`.
- A CI workflow for item-specific reproducibility can be introduced without colliding with protected release workflows.
- Evidence artifacts for this lane will use deterministic JSON triplets (`report.json`, `metrics.json`, `stamp.json`) compatible with existing evidence conventions.

## Validation Checklist

- [ ] Confirm exact evidence schema keys and EvidenceID pattern in active validators.
- [ ] Confirm canonical CI workflow/check names for reproducibility gates.
- [ ] Confirm preferred item slug/location conventions for new capability packs.
- [ ] Confirm profiling harness location and budget enforcement utilities.
- [ ] Confirm whether feature flag source-of-truth is YAML, JSON, or code-defined.

## Constraints

- No policy gate weakening.
- No direct modification of protected release/tagging workflows.
- No claim assertion without source excerpt mapping.
