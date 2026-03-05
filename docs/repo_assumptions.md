# Repo Assumptions & Reality Check

## Verified vs Assumed paths
- Assumed `agents/` runtime
- Assumed `scripts/`
- Assumed `tests/`
- Assumed `docs/`
- Assumed `.github/workflows/`

## Artifact schemas
- `run_plan.json`
- `execution_ledger.json`
- `patch_stack.json`
- `eval_report.json`
- `policy_report.json`

## Must-not-touch list
- existing artifact schemas
- CI workflow names
- security policy enforcement modules

---

# CBM Repo Assumptions — Cognitive Battlespace Map (CBM)

> Added: PR1 CBM scaffold audit (2026-03-05). Update after each CBM PR merges.

## Verified (post-audit, 2026-03-05)

| Item | Finding |
|------|---------|
| Python package root | `summit/` (contains `__init__.py`) |
| Python version | 3.11+ (pyproject.toml `requires-python = ">=3.11"`) |
| Graph library | NetworkX (≥3.3) — used in `ga-graphai`, `python/intelgraph_py`, `ml/` |
| Graph DB | Neo4j driver (`neo4j>=5.20`) — via `python/pyproject.toml` |
| Test runner | pytest with coverage; ruff lint/format; mypy type checking |
| Test location | `summit/tests/` parallel to source; `__init__.py` present |
| Evidence schema | `evidence/schema/` — JSON Schema Draft 7, stamp/index/report/metrics pattern |
| Evidence ID prefix | `EVID-` in existing schema; CBM extends to `EVID-CBM-` |
| CI entry points | `.github/workflows/summit-ci.yml`, `pr-gate.yml`; reusable `_reusable-python.yml` |
| Ruff config | `pyproject.toml` root — line-length 100, select E/F/I/UP/B/C90 |
| Feature flag config | `.ci/config/` (schema: `feature-flags.schema.json`) |
| Existing cognitive domain | `cogwar/` and `summit/fimi/` — CBM is additive, no conflict |
| Ingest pattern | `ingestion/ingestors/` base class + RSS/HTTP/STIX connectors |
| Artifact dir convention | `artifacts/<subsystem>/` (see `compliance/evidence/`, `cogwar/`) |
| Must-not-touch | `summit/main.py`, `summit/graph/model.py`, core CI gate workflows |

## Assumed (unverified — validate before PR2 merges)

| Assumption | Why | How to validate |
|------------|-----|-----------------|
| `summit/cbm/` is the correct package location | Mirrors existing domain modules (`fimi/`, `cogwar/`) inside `summit/` | `python -c "from summit.cbm import CBMConfig"` |
| `artifacts/cbm/` is writable in CI | Artifact dir convention from other subsystems | Check `.github/workflows/summit-ci.yml` for artifact upload steps |
| `networkx` available in test environment | Listed in `python/pyproject.toml` | `python -c "import networkx"` in CI |
| No existing `cbm` module conflicts | Searched — no `cbm` path found in repo | `find . -type d -name cbm` |
| Evidence ID format extension is compatible | Existing IDs use `EVID-` prefix; `EVID-CBM-` is additive | Schema validation test in `test_cbm_determinism.py` |

## Tradeoffs

1. **Separate `cbm/` package vs. extending `cogwar/` or `fimi/`:** Separate package
   chosen for cleaner feature-flag isolation and per-PR scope.
2. **Stub stages vs. full implementation in PR1:** Stubs keep PR1 reviewable;
   full implementations follow in PR2–PR6.
3. **Artifact dir as config param:** Allows CI replay (temp dir) and live mode.

## Validation Checklist (run before PR2 merges)

- [ ] `python -m pytest summit/tests/test_cbm_determinism.py -v` passes
- [ ] `ruff check summit/cbm/` passes (0 errors)
- [ ] `mypy summit/cbm/` passes (or suppressions documented)
- [ ] `import summit.cbm` succeeds in CI Python environment
- [ ] `artifacts/cbm/stamp.json` is emitted and deterministic across two identical runs
- [ ] CI `cbm_unit_tests` gate runs on PR
