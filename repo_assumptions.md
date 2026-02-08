# repo_assumptions.md

## Verified
- Language/runtime: Python (`summit/`) and Node.js (`server/`)
- Agent runtime location: `summit/agents/`
- Policy engine location: `summit/policy/` (specifically `engine.py`)
- CI: GitHub Actions in `.github/workflows/` (e.g., `summit-ci.yml`, `pr-gates.yml`)
- Evidence artifacts: `evidence/` directory with `metrics.json`, `report.json` conventions.
- Existing MCP root: `mcp/` exists (contains `allowlist.yaml`, `README.md`) but is outside `summit/` package.
- Package structure: `summit/` is the root package.

## Assumptions to validate
- `summit/mcp/` does not exist; we will create it to house the new MCP integration code.
- `summit/security/` exists; we will add strict policy enforcement logic there or extend `summit/policy/`.

## Must-not-touch
- Existing `summit/policy/engine.py` (unless extending via subclass/wrapper to avoid refactor).
- Existing `mcp/` root directory (preserve as legacy/reference).
- CI workflow required checks (unless adding new ones).

## Plan Alignment
- PR1: Create `summit/mcp/transport/` (HTTP/SSE, gRPC stubs).
- PR2: Create `summit/mcp/catalog/` (Tool sync).
- PR3: Create `summit/security/policy/` or extend `summit/policy/` for deny-by-default.
- PR4: Add to `summit/context/` (Packer).
- PR5: Add to `summit/models/` (Adapters).
- PR6: Add to `scripts/monitoring/` (Drift detection).
