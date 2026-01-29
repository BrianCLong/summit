# Integration Chain Runbook (IntelGraph → Maestro → CompanyOS)

## Purpose

Exercise the local or staging integration chain from IntelGraph to Maestro to CompanyOS.

## Prerequisites

- Docker and Docker Compose.
- `pnpm` installed.
- Ports available: `4000` (IntelGraph API), `8080` (Maestro API), `4100` (CompanyOS API).
- `.env` configured for local services (use `.env.example` where provided).

## Start the Stack (Local)

```bash
pnpm install
make bootstrap
make up
make conductor-up

docker compose -f docker-compose.companyos.dev.yml up -d
```

**Expected output**

- Docker containers report `healthy` in `docker ps`.
- `make up` starts the core IntelGraph stack.
- `make conductor-up` starts Maestro/Conductor services.
- CompanyOS API listens on `http://localhost:4100`.

## Verify Service Health

```bash
curl -s http://localhost:4000/health
curl -s http://localhost:8080/api/health
curl -s http://localhost:4100/health
```

**Expected output**

- IntelGraph returns a JSON payload with `status` or `ok`.
- Maestro returns `200` from `/api/health`.
- CompanyOS returns `{ "status": "ok" }` with service metadata.

## Exercise the Flow

### 1) Seed IntelGraph demo data

```bash
curl -X POST http://localhost:4000/api/demo/seed
```

**Expected output**

- `{ "status": "seeded", "duration": "1s" }`.

### 2) Confirm Maestro API readiness

```bash
curl -s http://localhost:8080/api/ready
```

**Expected output**

- `200` with readiness metadata when Postgres/Redis are reachable.

### 3) Confirm CompanyOS service availability

```bash
curl -s http://localhost:4100/health
```

**Expected output**

- JSON response with `status: "ok"`.

## Staging Variant

Replace `localhost` with the staging base URLs:

- IntelGraph API: `https://<staging-intelgraph>/health`
- Maestro API: `https://<staging-maestro>/api/health`
- CompanyOS API: `https://<staging-companyos>/health`

## Common Failure Modes

- **Port conflicts**: Another process is using `4000/8080/4100`; stop it or adjust compose ports.
- **`/api/ready` returns 503**: Maestro Postgres/Redis are not reachable; verify `make conductor-up` and DB containers.
- **`/health` 404 on CompanyOS**: Confirm `docker compose -f docker-compose.companyos.dev.yml` is running and port `4100` is mapped.
- **IntelGraph demo seed returns 500**: Confirm `make up` completed and check server logs (`make logs`).
