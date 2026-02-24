<<<<<<< HEAD
# Repo Reality Check: Summit GA Subsumption

## Structure Validation

| Assumed Path | Actual Path | Notes |
| :--- | :--- | :--- |
| `summit/agents/` | `summit/agents/` | Exists, but new logic is preferred in `packages/`. |
| `summit/graph/` | `packages/graphrag-core/` | `summit/graph/` exists (Python), but `packages/graphrag-core/` (TS) is the target for the TS evidence interface. |
| `summit/ingest/` | `summit/ingest/` & `ingest/` | `ingest/` at root exists and contains `wechat`. `summit/ingest/` exists. Will use root `ingest/webhooks/` for harness. |
| `summit/policy/` | `policy/opa/` | Root `policy/` exists and contains `opa/`. Root `policies/` also exists. Using `policy/opa/`. |
| `summit/sdk/companyos/` | `sdk/companyos/` | Root `sdk/` exists. `companyos` subdir will be created/documented there. |
| `summit/ci/` | `.github/workflows/` | Root `.github/workflows/` exists and is the standard location for Actions. |

## Confirmed Conventions

*   **Agents**: New agents/tools should be registered in `governance/tool_registry.yaml` (from `AGENTS.md`).
*   **Testing**: Jest for TS (`packages/`), Pytest likely for Python.
*   **Policy**: Rego files in `policy/opa/` seem to be the standard.
*   **Artifacts**: `artifacts/` directory exists for build outputs.

## Plan Mappings

*   **PR-1 (GraphRAG)**: `packages/graphrag-core/src/evidence.ts`
*   **PR-2 (Agents)**: `packages/memory/src/shared.ts` & `policy/opa/agent_gates.rego`
*   **PR-3 (Ingest)**: `ingest/webhooks/latency_harness.ts`
*   **PR-4 (Security)**: `.github/workflows/provenance.yml`
*   **PR-5 (Docs)**: `docs/compliance/`
*   **PR-6 (SDK)**: `sdk/companyos/README.md`
=======
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
>>>>>>> origin/main
