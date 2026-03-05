# Runnability Audit 2026-02-26: Ops Runbook

## Common Bring-up Failures
1. **Ports in use**: If `docker compose` complains about a port being bound, use `lsof -i :<port>` or `docker ps` to find the offending process and stop it.
2. **Docker network missing**: By default, `docker:dev` attempts to create the `summit` network. If it fails, run `docker network create summit`.
3. **Healthchecks failing**: Ensure `.env` is populated from `.env.example` with the necessary passwords (`POSTGRES_PASSWORD`, `NEO4J_PASSWORD`) for healthchecks to authenticate successfully.

## How to Reset the Environment
To completely reset the local databases:
```bash
docker compose down -v
# This destroys the volumes and resets the state.
```

## How to Verify Health
- View running containers: `docker ps`
- View specific compose logs: `docker compose logs -f <service>`
- Verify compose health statuses: `docker compose ps`
