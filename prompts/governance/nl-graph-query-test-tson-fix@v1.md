# Prompt: nl-graph-query-test-tson-fix@v1

## Purpose
Ensure nl-graph-query route tests use a supported JSON body parser when `express.tson` is unavailable in the test runtime.

## Scope
- `.gitattributes`
- `docs/roadmap/STATUS.json`
- `prompts/registry.yaml`
- `prompts/governance/gitattributes-lfs-exception@v1.md`
- `prompts/governance/nl-graph-query-test-tson-fix@v1.md`
- `server/src/ai/nl-graph-query/__tests__/nl-graph-query.routes.test.ts`

## Instructions
1. Replace unsupported `express.tson()` usage in the nl-graph-query route test with `express.json()`.
2. Keep the change minimal and test-scoped; avoid production runtime behavior changes.
3. Update `docs/roadmap/STATUS.json` with the new revision note and timestamp.
4. Register this prompt in `prompts/registry.yaml` with its SHA-256 hash.
5. Ensure PR metadata references the new prompt hash and declared scope.

## Verification
- `pnpm test:unit` passes the nl-graph-query route tests when the environment is otherwise healthy.
