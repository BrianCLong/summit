# Repo Assumptions & Validation

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
|Str|Str|Str|Str|
| `summit/` | `summit/` | ✅ Exists | Root directory containing features and core logic. |
| `intelgraph/` | `intelgraph/` | ✅ Exists | Root directory. Python package (has `__init__.py`) and sub-services. |
| `agents/` | `agents/` | ✅ Exists | Root directory. Contains agent definitions (e.g., `osint`, `psyops`). |
| `pipelines/` | `pipelines/` | ✅ Exists | Root directory. |
| `docs/` | `docs/` | ✅ Exists | Root directory. |
| `scripts/` | `scripts/` | ✅ Exists | Root directory. |
| `tests/` | `tests/` | ✅ Exists | Root directory. |
| `.github/workflows/` | `.github/workflows/` | ✅ Exists | Root directory. |

## Component Mapping

| Planned Component | Proposed Location | Actual Location / Action |
|Str|Str|Str|
| Streaming Narrative Graph Core | `intelgraph/streaming/` | Create `intelgraph/streaming/` (New Python subpackage). |
| Maestro Agent Conductor | `agents/maestro/` | `maestro/` (Root dir) exists. Will use `maestro/conductor.py`. |
| Narrative Strength Index | `metrics/ns_index.json` | `metrics/` exists. Logic likely in `intelgraph/streaming/analytics.py`. |
| Evidence Bundle | `evidence/` | `evidence/` exists. Will follow existing schema/patterns. |

## Constraints & Checks

* **Graph Storage**: `intelgraph/services/ingest` and `intelgraph/graph_analytics` suggest existing graph infrastructure.
* **Agent Runtime**: `maestro/app.py` suggests Python. `agents/` seem to be config/definitions? Or logic too? (Checked `agents/osint`, it's a dir, likely logic).
* **CI Gates**: `AGENTS.md` lists `make smoke`, `pnpm test`.
* **Evidence Policy**: `docs/governance/EVIDENCE_ID_POLICY.yml` (from memory) and `evidence/schemas/` (from memory) should be respected.

## Sigstore Smoke Harness Assumptions (2026-02-07)

* **Assumed**: Node/TypeScript monorepo with `pnpm`, CI workflows in `.github/workflows/`, tests under `tests/`.
* **Assumed must-not-touch**: release/deploy workflows, CodeQL workflow, secret handling.
* **Validate before merge**:
  1. Identify the workflow and script entrypoint for Summit’s supply-chain verification gate.
  2. Confirm whether Cosign/Rekor are vendored binaries or container-based tools.
  3. Verify artifact upload conventions and evidence schema expectations.

## Next Steps

1. Implement **PR-1: Streaming Narrative Graph Core** in `intelgraph/streaming/`.
2. Implement **PR-4: Maestro Agent Conductor** in `maestro/` (adapting from plan's `agents/maestro/`).
3. Implement **Sigstore negative-case smoke harness** under `src/agents/supplychain/sigstore_smoke/`.
