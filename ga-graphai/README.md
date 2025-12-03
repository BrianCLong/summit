# GA-GraphAI

IntelGraph Graph AI & analytics monorepo.

## Quickstart

```bash
cp .env.example .env
npm install --workspaces
docker-compose up
```

## Pipeline

```
features -> embeddings -> ER -> LP -> communities/anomalies -> explain -> overlay -> export
```

## CI safeguards

- A resource leak detector runs in CI to ensure tests close DB, Redis, socket, and file handles. The check lives in `.github/scripts/check_resource_leaks.sh`, validates required tooling (`lsof`, `pgrep`, `ps`), and supports overrides via `DB_PORTS`, `REDIS_PORTS`, `SOCKET_THRESHOLD`, and `FILE_HANDLE_THRESHOLD`. It runs automatically after the test steps.
