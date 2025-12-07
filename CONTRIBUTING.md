# Contributing

## Branching and Commits
- Use `type/scope/short-desc` branch names (e.g., `feat/ingest/rest-connector`).
- Follow Conventional Commits (e.g., `feat: add ingest mapper`).

## Pull Requests
- Provide a concise description and link issues (e.g., `Closes #123`).
- Include screenshots for UI changes and ensure CI is green.
- Add preview instructions when relevant (Docker/Helm/compose).

## Testing
- Run `pnpm -w run test:unit` and `pytest -q` before requesting review when applicable.
- Maintain or add unit tests; prefer additive schema changes only.
- `/healthz` endpoints should return HTTP 200 for services.

## Feature Flags
- Default new functionality to OFF; document flags in the PR description.
- Keep additive migrations/contracts and avoid breaking existing consumers.
