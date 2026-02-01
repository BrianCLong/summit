# Summit — Maestro MCP Flowpacks Scaffold (v1)

**Objective:** Standardize Maestro MCP flow packs for Summit components (ig/mc/sb/co) and a combined summit-platform bundle. Provide Dockerized Maestro MCP images that embed the flow packs and support stdio MCP execution.

## Scope

- Create flow pack packages under `packages/` for:
  - `packages/ig/`
  - `packages/mc/`
  - `packages/sb/`
  - `packages/co/`
  - `packages/summit-platform/`
- Add Docker scaffolding under `docker/maestro-mcp/` for Maestro MCP runtime images (multi-target).
- Update `docs/roadmap/STATUS.json` with a concise revision note and timestamp.

## Constraints

- Do not alter runtime behavior outside Maestro flow-pack packaging and Docker scaffolding.
- Use Java 17 in Docker base image for Maestro CLI compatibility.
- Use stdio MCP invocation: `maestro mcp` as container entrypoint.
- Keep changes strictly scoped to the files listed below.

## Allowed Operations

- Create new directories and files as specified.
- Edit registry/metadata files required for prompt integrity.

## Files

- `packages/ig/`
- `packages/mc/`
- `packages/sb/`
- `packages/co/`
- `packages/summit-platform/`
- `docker/maestro-mcp/`
- `docs/roadmap/STATUS.json`
- `prompts/maestro/maestro-mcp-flowpacks@v1.md`
- `prompts/registry.yaml`

## Acceptance Criteria

- Each component pack has `package.json`, `manifest.json`, and a `flows/` directory.
- `summit-platform` manifest references all four components.
- Dockerfile builds component and platform targets and defaults to `maestro mcp`.
- `docs/roadmap/STATUS.json` updated with a new revision note.
- Prompt is registered in `prompts/registry.yaml` with correct SHA-256.
