---
title: "Run smoke tests"
summary: "Execute the golden-path smoke validation to confirm UI and gateway health."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "ops"
---

# Run smoke tests

Use the Makefile smoke target to validate a fresh stack.

## Steps

1. Ensure Docker is running and the stack is up (`make up`).
2. Run the smoke test sequence:
   ```bash
   make smoke
   ```
   The target waits for containers to initialize, checks the UI at `http://localhost:3000`, and curls the gateway health endpoint at `http://localhost:8080/health`.
3. Inspect logs for any failure:
   ```bash
   docker compose -f docker-compose.dev.yaml logs --tail=100
   ```

## Expected result

- UI and gateway checks return HTTP 200.
- Failures print `❌` statuses; re-run after fixing port conflicts or missing containers.

## Next steps

- If the smoke test fails, move to [Troubleshooting](../troubleshooting/README.md).
- When smoke passes, proceed to the [first-run tutorial](../tutorials/first-runbook.md).
