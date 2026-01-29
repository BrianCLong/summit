# Repo Assumptions & Reality Check

## Verified
1.  **Repo Structure**: `BrianCLong/summit` exists.
2.  **Languages**: Mixed TypeScript (Node.js) and Python.
3.  **Python Location**: `python/intelgraph_py/` is the main app, but `ai-ml-suite/` exists and is suitable for isolated ML modules.
4.  **CI/CD**: `pnpm` based for Node.js. No active Python CI pipeline found in `.github/workflows/` (most are in `.archive/`).
5.  **Evidence/Schema**: No central `packages/evidence` found. `python/intelgraph_py/schemas.py` uses Pydantic.

## Decisions
1.  **Module Location**: `ai-ml-suite/emu3/` (New package).
2.  **Schema**: Defined locally in `ai-ml-suite/emu3/summit_emu3/schema.py` (Pydantic).
3.  **CI**: Create new workflow `.github/workflows/emu3-ci.yml` for Python testing.
4.  **Ingestion**: Use a CLI/Script hook pattern (`ai-ml-suite/emu3/scripts/ingest_hook.py`) rather than modifying `intelgraph-py` deeply, to maintain loose coupling.

## Risks
1.  **CI Integration**: Adding a new workflow file might require repo permissions/settings that are invisible here.
2.  **Dependencies**: `ai-ml-suite` is not currently managed by a root `pyproject.toml`. It will be self-contained.
