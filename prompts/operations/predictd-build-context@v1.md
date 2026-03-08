# Summit — Predictd Docker Build Context Reduction (v1)

**Objective:** Reduce predictd Docker build context to avoid BuildKit grpc crashes during dev stack builds.

## Scope
- `services/predictd/Dockerfile`
- `docs/roadmap/STATUS.json`
- `prompts/operations/predictd-build-context@v1.md`
- `prompts/registry.yaml`

## Constraints
- Copy only required sources and config for predictd.
- Do not change runtime behavior.

## Acceptance Criteria
- `docker compose -f docker-compose.dev.yaml up --build -d` no longer fails with BuildKit grpc error in predictd build.
- Roadmap status updated.
