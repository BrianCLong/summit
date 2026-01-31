# Summit — Gateway Docker Build Context Fix (v1)

**Objective:** Ensure Docker builds for gateway include ga-graphai workspace packages so pnpm file: dependencies resolve.

## Scope
- `apps/gateway/Dockerfile`
- `docs/roadmap/STATUS.json`
- `prompts/operations/gateway-ga-graphai-context@v1.md`
- `prompts/registry.yaml`

## Constraints
- Keep Dockerfile changes minimal and targeted to build context.
- Do not modify runtime behavior.
- Preserve existing build steps and ordering.

## Acceptance Criteria
- `docker compose -f docker-compose.dev.yaml up --build -d` no longer fails with `ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND` for ga-graphai packages.
- Roadmap status updated with this fix.
