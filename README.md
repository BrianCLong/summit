# Summit — Agentic AI OSINT Platform

Open-source intelligence gathering powered by agentic AI, knowledge graphs, and real-time data ingestion.

## Quickstart (Fixed — Feb 2026)

### Prerequisites
- Node.js 18+
- Docker + Docker Compose (v2)
- pnpm via Corepack (recommended)

Enable pnpm via Corepack:
```bash
corepack enable
```

### 1) Clone & Clean

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
pnpm run cleanup          # removes .archive, .disabled, .quarantine bloat (if present)
pnpm run setup            # bootstrap + permissions
```

### 2) Environment (first time only)

```bash
cp .env.example .env
# Edit .env and replace ALL placeholder secrets (minimum 32 chars for JWT/session secrets).
```

### 3) Install (pnpm everywhere)

```bash
pnpm install
```

### 4) Start the full local dev stack (recommended)

This repo’s complete dev stack (datastores + observability) is defined in `docker-compose.dev.yml`.

```bash
pnpm run docker:dev
# (Equivalent) docker compose -f docker-compose.dev.yml up -d
```

> Note: `docker-compose.yml` uses an **external** Docker network named `intelgraph`.
> If you run that file directly, you must create the network first:
>
> ```bash
> docker network create intelgraph 2>/dev/null || true
> ```

### 5) Database migrate + seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 6) Start dev servers

```bash
pnpm dev
```

* API: `http://localhost:4000/graphql`
* Web UI: `http://localhost:3000`

### Health check

```bash
curl -X POST http://localhost:4000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health { status version } }"}'
```

---

## Docs

* Development setup: `docs/development/setup.md`
* Architecture entry point: `docs/architecture/README.md`
