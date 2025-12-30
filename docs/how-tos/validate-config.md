---
title: "Validate configuration"
summary: "Check environment files against the IntelGraph server validation command."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "ops"
---

# Validate configuration

Keep environment drift low by running the built-in validation script.

## Steps

1. Populate `.env` and `server/.env` using the provided examples.
2. Run the validator filtered to the server workspace:
   ```bash
   pnpm --filter intelgraph-server run config:validate
   ```
3. Fix any missing variables flagged by the script (e.g., `DATABASE_URL`, `NEO4J_URI`, `REDIS_HOST`).

## Expected result

The command exits with status 0 when required variables are present and formatted correctly.

## Next steps

- Proceed to [Run smoke tests](run-smoke-tests.md) after validation.
- Review the [config reference](../reference/config.md) for variable meanings and defaults.
