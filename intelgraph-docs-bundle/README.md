# IntelGraph

IntelGraph is a full‑stack intelligence graph platform that unifies entity ingestion, analysis, and visualization.

> **Stack snapshot (auto‑discovered)**  
> • Frontend: React + Vite + Apollo Client + MUI + Cytoscape  
> • Backend: Node.js + Express + GraphQL + WebSockets  
> • Data: Neo4j graph + PostgreSQL + Redis  
> • Ops: Docker Compose present

## Quick start (local)

```bash
# 1) Install
npm install
cd client && npm install && cd ..

# 2) Run dev
npm run dev:server   # or: (cd server && npm run dev)
npm run dev:client   # or: (cd client && npm run dev)

# 3) Configure env
cp .env.example .env
# set DB urls/secrets

# 4) (Optional) Launch via Docker
docker compose up -d
```

### Scripts (from package.json)

- Frontend: `vite dev`, `vite build`, `vitest`, `playwright test`
- Backend: `nodemon dev`, `jest`, `db:migrate`, `db:seed`

## Architecture

See `docs/generated/ARCHITECTURE.md` for the detailed diagram covering client ↔ server ↔ databases, real‑time channels, and observability.

## API

GraphQL schemas and resolvers live in `server/src/graphql/`. If present, a compiled schema is also in `docs/API_GRAPHQL_SCHEMA.graphql`. Quick introspection and example queries are documented in `docs/generated/API.md`.

## Roadmap & Contributing

- Roadmap: `docs/generated/ROADMAP.md`
- Project plan & OKRs: `docs/generated/PROJECT_PLAN.md`
- Contributing: `docs/generated/CONTRIBUTING.md`
- Security: `docs/generated/SECURITY.md`

## Competitive Positioning

See `docs/generated/COMPETITIVE_STRATEGY.md`. We analyzed 164 competitors across 100 features; low‑coverage opportunities are prioritized for disruption.

---

© 2025 IntelGraph.
