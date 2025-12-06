# Healthcheck and Readiness Policy

All Summit services must fail fast on missing prerequisites and only accept traffic after dependencies are verified. The following rules apply to every first-party container (API, worker, UI, supporting jobs):

- **Endpoints**: expose `/health` (liveness) and `/ready` (dependency/readiness) HTTP endpoints.
- **Dependency gates**: readiness should verify critical backing services (Postgres, Neo4j, Redis, queues, policy engines) before returning 200.
- **Startup order**: use `depends_on` with `condition: service_healthy` where possible to block premature startups.
- **Healthchecks**: Docker healthchecks must target `/ready` for first-party services. Third-party infrastructure components retain their native checks.
- **Fail fast**: startup must abort when required environment variables are missing or dependencies cannot be reached.
- **CI enforcement**: `node scripts/scan-startup-races.mjs --compose docker-compose.yml` is required for PRs touching service startup logic; CI also runs the runtime scan with `--runtime` to block regressions.

## Example expectations

- API containers exit early if any of `POSTGRES_*`, `NEO4J_*`, or Redis connection info is absent.
- Worker containers report `503` on `/ready` until Redis is reachable and the worker loop is running.
- UI containers only start after the API is healthy to avoid serving broken shell pages.
- Healthcheck intervals should stay at 10–15s with a minimum of 5 retries for stability during cold starts.
