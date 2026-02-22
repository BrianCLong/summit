# Golden Path Troubleshooting

This document covers common issues encountered when running the Summit "Golden Path" (`make clean`, `make bootstrap`, `make up`).

## 1. Missing .env File

**Symptoms:**
`make up` fails with interpolation errors like:
`error while interpolating services.postgres.environment.POSTGRES_PASSWORD: required variable POSTGRES_PASSWORD is missing a value`

**Fix:**
Ensure `.env` exists. The `scripts/golden-path.sh` script automatically creates it from `.env.example` if missing. You can also manually do it:
```bash
cp .env.example .env
```
Note: Some required variables like `POSTGRES_PASSWORD` must be present in `.env`. Ensure your `.env.example` is up to date.

## 2. Docker Hub Rate Limits

**Symptoms:**
`make up` fails with:
`Error response from daemon: error from registry: You have reached your unauthenticated pull rate limit.`

**Fix:**
- Wait for the rate limit to reset (usually 1 hour for unauthenticated users).
- Log in to Docker Hub: `docker login`.
- Use a different network/IP if possible.
- In CI environments, this is a common issue. If you only need to verify configuration, use `docker compose config` instead of a full `up`.

## 3. Bootstrap Failures (Python/Node)

**Symptoms:**
`make bootstrap` fails during `pip install` or `pnpm install`.

**Fix:**
- Ensure `python3` and `pnpm` are installed and in your PATH.
- Clear `.venv` and `node_modules`:
  ```bash
  rm -rf .venv node_modules
  make bootstrap
  ```
- Check for dependency conflicts in the output logs.

## 4. Docker Daemon Not Running

**Symptoms:**
`make up` fails with:
`Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?`

**Fix:**
- Ensure Docker Desktop or Docker Engine is started.
- Check permissions on `/var/run/docker.sock`.

## 5. Port Conflicts

**Symptoms:**
`make up` fails with "port is already allocated":
`Bind for 0.0.0.0:5432 failed: port is already allocated`

**Fix:**
Identify and stop the process using the port (e.g., a local Postgres or Neo4j instance):
```bash
lsof -i :5432
# or
docker ps # to see if other containers are running
```
Stop the conflicting service and try again.
