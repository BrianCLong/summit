# Repo Assumptions & Reality Check

## Verified (Ground Truth)

1.  **MCP Structure Exists:**
    *   `mcp/` root directory contains `README.md` (governance policy) and `allowlist.yaml` (governance config).
    *   `src/mcp/` directory contains `types.ts` (defining `McpTool`, JSON-RPC types) and `client/`.
    *   `mcp/summit_server/` exists (likely a reference implementation or placeholder).

2.  **Evidence & CI:**
    *   `scripts/ci/emit_evidence_stamp.mjs` exists and is used in `.github/workflows/ci.yml`.
    *   CI workflows (e.g., `ci.yml`, `agent-guardrails`) are present.

3.  **Agent Runtime:**
    *   `services/agent-runtime` exists.
    *   `swarm/` directory contains agent logic (`agent_manifest.ts`, `runtime.ts`).

4.  **Language:**
    *   Primary logic is TypeScript (`src/`, `services/`, `scripts/`).
    *   Package manager is `pnpm`.

## Assumptions (To Validate)

1.  **New MCP Logic Location:**
    *   We assume `src/mcp/` is the correct home for the new `manifest.ts` and `catalog.ts` modules, extending the existing `types.ts`.

2.  **Governance Integration:**
    *   We assume `mcp/allowlist.yaml` is the intended source of truth for the new `policy/engine.ts` (PR2).

3.  **CI Artifacts:**
    *   We assume we can create a new directory `artifacts/mcp_conformance/` for deterministic outputs without breaking existing artifact upload steps (need to ensure `ci.yml` captures it or add a step).

## Validation Commands

*   `ls -F src/mcp/` (Verified: client, schema, types.ts)
*   `cat mcp/allowlist.yaml` (Verified: defines allowed_servers)

## Must-Not-Touch Files

*   `.github/workflows/ci.yml` (unless strictly necessary for additive steps).
*   `scripts/ci/*` (unless extending functionality).
