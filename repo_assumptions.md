# Repo Assumptions & Validation (MARS)

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
|Str|Str|Str|Str|
| `summit/` | `summit/` | ✅ Verified | Root feature package. |
| `summit/mars/` | `summit/mars/` | ✅ Verified | Location of MARS implementation. |
| `tests/` | `tests/` | ✅ Verified | Root test directory. |
| `docs/` | `docs/` | ✅ Verified | Root documentation directory. |

## Component Mapping (MARS)

| Component | Implementation File | Verified |
|Str|Str|Str|
| Budget Ledger | `summit/mars/cost.py` | ✅ Verified |
| MCTS Planner | `summit/mars/planner_mcts.py` | ✅ Verified |
| Modular Pipeline | `summit/mars/pipeline.py` | ✅ Verified |
| Reflective Memory | `summit/mars/reflect.py` | ✅ Verified |
| Security Redaction | `summit/mars/redact.py` | ✅ Verified |

## CI & Standards
- **Test Runner**: `pytest` confirmed.
- **Evidence Schema**: `summit/mars/schemas/` provides Draft-07 schemas (integrated into `evidence/index.json`).
- **PII/Secrets**: `redact.py` implements mandatory redaction.
- **Determinism**: Seeded MCTS verified in `test_mars_mcts_determinism.py`.
