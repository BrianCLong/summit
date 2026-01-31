# Summit — ER Service Requirements Restore (v1)

**Objective:** Restore `services/er-service/requirements.txt` so Docker builds succeed.

## Scope
- `services/er-service/requirements.txt`
- `docs/roadmap/STATUS.json`
- `prompts/operations/er-service-requirements@v1.md`
- `prompts/registry.yaml`

## Constraints
- Keep dependencies minimal and pinned.
- Do not change runtime behavior beyond restoring missing dependencies.

## Acceptance Criteria
- `docker compose -f docker-compose.dev.yaml up --build -d` no longer fails at `COPY requirements.txt`.
- Roadmap status updated.
