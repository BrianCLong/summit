---
title: "Troubleshooting"
summary: "Symptom-based fixes for local and CI environments."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "ops"
---

# Troubleshooting

## If `make smoke` fails on UI check

- Confirm port 3000 is free and the `ui`/`report-studio` container is running.
- Re-run `docker compose -f docker-compose.dev.yaml logs ui` for details, then `make up`.

## If Gateway health fails

- Ensure the gateway container exposes `/health` on 8080 as expected by the Makefile.
- Restart with `make down && make up`, then re-run `scripts/health-check.sh`.

## If GraphQL is unreachable on 4000

- Verify the `policy-lac` service is up via `docker compose ps policy-lac`.
- Confirm `CORS_ORIGIN` includes your UI origin if calling from a browser.

## If database connectivity fails

- Check `DATABASE_URL` and credentials from `server/.env.example`.
- Use `docker compose exec postgres pg_isready -U postgres` to confirm readiness.

## Next steps

- Revisit the [error catalog](../reference/errors.md) for quick fixes.
- Validate environment files with the [config how-to](../how-tos/validate-config.md).
