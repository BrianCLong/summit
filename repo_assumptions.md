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
