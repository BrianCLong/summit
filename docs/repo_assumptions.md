# Repo Assumptions & Verification - Local Notes Semantic Synthesis

## Verified Paths
| Path | Status | Notes |
| --- | --- | --- |
| `summit/` | ✅ Verified | Root Python package. |
| `summit/ingest/` | ✅ Verified | Existing ingestion logic (Python). |
| `summit/graph/` | ✅ Verified | Existing graph logic (Python). |
| `summit/evidence/` | ✅ Verified | Existing evidence logic (Python). |
| `docs/governance/` | ✅ Verified | Governance documentation. |
| `.github/workflows/` | ✅ Verified | CI workflows. |
| `scripts/` | ✅ Verified | Utility scripts. |
| `tests/` | ✅ Verified | Test suites. |

## Assumed Paths (New)
| Path | Role |
| --- | --- |
| `summit/ingestion/` | New deterministic notes ingestion pipeline. |
| `summit/embeddings/` | Pluggable local embedding provider. |
| `summit/report/` | Semantic report generation. |
| `artifacts/` | Output directory for deterministic connection artifacts. |
| `samples/notes/` | Sample corpus for validation. |

## Must-Not-Touch List
- `summit/ingest/*` (unless integrating)
- `summit/api/*`
- `package.json`, `pnpm-lock.yaml`
- `pyproject.toml`, `requirements.in` (unless adding critical deps)

## Required Renames
- None. `summit/ingestion` will be used for the new pipeline to distinguish it from the legacy `summit/ingest`.
