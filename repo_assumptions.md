# Repo Assumptions & Validation (ai-mockup-2026)

## Verified vs Assumed

| Check | Result | Evidence |
| --- | --- | --- |
| `benchmarks/` exists | ✅ Verified | `find benchmarks -maxdepth 2 -type f` |
| GitHub Actions CI exists | ✅ Verified | `.github/workflows/` tree present |
| Evidence triad (`report.json`, `metrics.json`, `stamp.json`) conventions exist | ✅ Verified | `scripts/evidence_validate.py`, `scripts/ci/validate_evidence_schema.py` |
| Deterministic artifact policy exists | ✅ Verified | `scripts/evidence_validate.py` deterministic formatting + timestamp locality checks |
| Existing ai-mockup benchmark scaffold exists | ❌ Not found | Added new `benchmarks/ai-mockup-2026/` |

## CI Check Mapping (for this slice)

- `python3 benchmarks/ai-mockup-2026/runner.py --check`
- `python3 scripts/monitoring/ai-mockup-2026-drift.py`
- `pytest benchmarks/ai-mockup-2026/test_runner.py`

## Must-Not-Touch Confirmation

No core evaluator or unrelated benchmark framework files were modified outside:
- `benchmarks/ai-mockup-2026/`
- `reports/ai-mockup-2026/`
- `scripts/monitoring/ai-mockup-2026-drift.py`
- docs/workflow/status metadata files required for governance.
