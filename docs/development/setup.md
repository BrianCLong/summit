
# Development Setup

The canonical local development setup is documented in the root **README Quickstart (Fixed — Feb 2026)**.

If you hit issues:

* Confirm `.env` exists and secrets/placeholders are replaced.
* Use the full dev stack: `pnpm run docker:dev` (`docker-compose.dev.yml`).
* If you run `docker-compose.yml` directly, create the external network first:

  ```bash
  docker network create intelgraph 2>/dev/null || true
  ```
