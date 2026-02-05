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

## Next Steps

1. Implement **PR-1: Streaming Narrative Graph Core** in `intelgraph/streaming/`.
2. Implement **PR-4: Maestro Agent Conductor** in `maestro/` (adapting from plan's `agents/maestro/`).

## VibeTensor Subsumption Module Assumptions

| Plan Path | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| `modules/vibetensor/` | `modules/vibetensor/` | ✅ Exists | New experimental module scaffold for methodology artifacts. |
| `configs/vibetensor.yaml` | `configs/vibetensor.yaml` | ✅ Exists | Feature flag defaults off. |
| `docs/standards/` | `docs/standards/` | ✅ Exists | Standard location for new module standards docs. |
| `artifacts/vibetensor/` | `artifacts/vibetensor/` | ❓ Assumed | Will be created by pipelines, not committed. |

### CI Workflow Reality Check

| Expected CI Input | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| PR quality gate | `.github/workflows/pr-quality-gate.yml` | ✅ Exists | Primary CI reference for PR validation. |
| Governance gates | `.github/workflows/ci-governance.yml` | ✅ Exists | Governance enforcement workflow present. |
| Evidence validation | `.github/workflows/evidence-validate.yml` | ✅ Exists | Evidence artifact validation present. |

### Must-Not-Touch List (Carry-Forward)

- Lockfiles (`pnpm-lock.yaml`, `Cargo.lock`) unless explicitly required.
- Release automation and workflow templates.
- Any secret-bearing or credential-bearing files.
