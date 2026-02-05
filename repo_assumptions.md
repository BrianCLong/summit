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
## Test Placement
- `agents/orchestrator/__tests__/daao/difficulty/*.test.ts`
- `agents/orchestrator/__tests__/daao/routing/*.test.ts`
- `agents/orchestrator/__tests__/daao/collaboration/*.test.ts`

## Graph-KG Platforms CI 2026-02-05

### Verified Paths (current state)

| Path | Status | Notes |
|Str|Str|Str|
| `server/src/rag/` | ✅ Exists | Retrieval logic, evidence contract, intent compiler present. |
| `server/src/routes/graphrag.ts` | ✅ Exists | GraphRAG REST routes. |
| `server/src/config/featureFlags.ts` | ✅ Exists | Feature flag registry. |
| `docs/standards/` | ✅ Exists | Standards docs location. |
| `docs/security/data-handling/` | ✅ Exists | Data handling docs location. |
| `docs/ops/runbooks/` | ✅ Exists | Runbooks location. |
| `.github/workflows/ci-security.yml` | ✅ Exists | Security gate workflow. |
| `.github/policies/` | ✅ Exists | Policy config directory. |

### Evidence & Checks

- Evidence ID format source: `docs/governance/EVIDENCE_ID_POLICY.yml` (verified).
- Required check names: Deferred pending validation from `required_checks.todo.md` and `.github/protection-rules.yml`.

### Must-Not-Touch (Governed Exceptions only)

- `.github/workflows/codeql.yml` (extend only via reusable workflows).
- Existing production connector implementations under `server/src/connectors/**` unless feature-flagged.
- Evidence schema contracts under `server/src/rag/evidence.ts` (extend additively only).
