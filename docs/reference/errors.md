---
title: "Error catalog"
summary: "Common runtime and validation errors observed in MVP-4 workflows."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "ops"
---

# Error catalog

| Symptom                                                                     | Where it appears                                      | Likely cause                                          | Fix                                                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `❌ UI failed` during `make smoke`                                          | Makefile smoke target                                 | UI container not ready or port 3000 blocked           | Ensure Docker is running, free port 3000, then rerun `make up` followed by `make smoke`. |
| `❌ Gateway failed` during `make smoke`                                     | Makefile smoke target                                 | Gateway container not serving `/healthz` on port 8080 | Check Compose logs for `gateway`, restart the stack with `make down && make up`.         |
| `Connection failed` in `scripts/health-check.sh` for Neo4j/PostgreSQL/Redis | Health check script                                   | Service container stopped or credentials mismatch     | Confirm credentials in `server/.env` match the Compose defaults and containers are `Up`. |
| `config:validate` reports missing variables                                 | `pnpm --filter intelgraph-server run config:validate` | `.env` or `server/.env` missing required keys         | Copy from `.env.example` and `server/.env.example`, then rerun the validator.            |

## Next steps

- If issues persist, review the [troubleshooting guide](../troubleshooting/README.md).
- Re-run [smoke tests](../how-tos/run-smoke-tests.md) after applying fixes.
