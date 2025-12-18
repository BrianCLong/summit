# Summit Doctor

`summit doctor` verifies a local developer workstation for the Summit stack and can auto-heal common gaps.

## What it checks

- **Node.js**: Requires v18+.
- **pnpm**: Verifies availability and optionally installs via Corepack (pnpm@9.12.0).
- **Docker**: Confirms CLI is present and daemon is reachable.
- **Redis**: Probes connectivity using `REDIS_URL`/`REDIS_HOST`/`REDIS_PORT` (defaults to `127.0.0.1:6379`).
- **PostgreSQL**: Probes connectivity using `DATABASE_URL` or `POSTGRES_HOST`/`POSTGRES_PORT` (defaults to `127.0.0.1:5432`).
- **Makefile**: Ensures the golden-path targets (`bootstrap`, `up`, `migrate`, `smoke`, `down`) are present.
- **Environment files**: Confirms `.env` exists; auto-creates it from `.env.example` when `--fix` is used.

## Usage

From the repository root:

```bash
pnpm --filter @intelgraph/cli build
node cli/dist/summit.js doctor
```

Or, after building, install the CLI binary for easier access:

```bash
npm install -g ./cli
summit doctor --fix
```

### Options

- `--env-file <path>`: Path to your `.env` (defaults to `./.env`).
- `--fix`: Apply safe auto-healing (enable pnpm via Corepack, create `.env` from `.env.example`).
- `--json`: Emit a machine-readable report.

### Example output

```
🩺 Summit Doctor - local environment diagnostics
----------------------------------------------
✅ .env file: Created /workspace/summit/.env from .env.example
✅ Node.js: Node.js v20.10.0 (recommended)
✅ pnpm: pnpm was installed via auto-heal
⚠️  Docker: Docker CLI found but daemon is not reachable
✅ Makefile: Required Make targets are present
⚠️  Redis: Redis not reachable at 127.0.0.1:6379
⚠️  PostgreSQL: PostgreSQL not reachable at 127.0.0.1:5432

Summary:
  Passed: 4/7 | Warnings: 3 | Failed: 0
  Auto-healed items: 2
  Env file: /workspace/summit/.env
```
