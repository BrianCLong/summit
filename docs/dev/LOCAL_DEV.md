# Local Development Guide (MVP-4-GA)

This guide provides a single-command bootstrap path for a fresh clone and the quickest smoke validation for the MVP-4-GA stack.

## Prerequisites

- Docker Engine with the Compose plugin (`docker compose`) running
- `make` available in your shell
- `curl` for smoke checks

> **Tip:** These commands are additive and only start the local stack; production behavior is untouched.

## One-command bootstrap

```bash
cp .env.example .env && make dev:up
```

The `dev:up` target will:

1. Validate Docker/Compose, `make`, `.env`, and `docker-compose.dev.yaml` are present.
2. Build and start the local services defined in `docker-compose.dev.yaml`.

Once containers are up, run the smoke check:

```bash
make dev:smoke
```

To stop and clean volumes:

```bash
make dev:down
```

## Environment variables

All required variables for local startup live in `.env.example`. Copy it to `.env` before running any commands. Values are safe placeholders you can adjust per your setup.

## Common failures & fixes

| Symptom                                           | Likely Cause                            | Fix                                                                                     |
| ------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `docker: command not found`                       | Docker CLI not installed                | Install Docker Desktop/Engine and re-run `make dev:up`.                                 |
| `Cannot connect to the Docker daemon`             | Docker not running or permission denied | Start Docker; ensure your user can access the daemon (`sudo usermod -aG docker $USER`). |
| `docker compose: command not found`               | Compose plugin missing                  | Install the Docker Compose plugin (v2).                                                 |
| `Missing .env` message                            | `.env` not created                      | Run `cp .env.example .env` before `make dev:up`.                                        |
| `address already in use` when starting containers | Ports 3000/8080/810x/4001 in use        | Stop conflicting processes or adjust ports in `docker-compose.dev.yaml` and `.env`.     |
| Smoke check fails with `Connection refused`       | Services still initializing             | Wait a few more seconds, then retry `make dev:smoke`.                                   |

## What gets started

- UI at http://localhost:3000
- Gateway at http://localhost:8080 (health: `/health`)
- Supporting services (policy compiler, prov-ledger, ai-nlq, er-service, ingest, zk-tx, predictd) exposed on the `810x` and `4001` ports

## Fast path after changes

- `make dev:up` (starts or rebuilds services)
- `make dev:smoke` (verifies UI and gateway respond)
- `make dev:down` when finished
