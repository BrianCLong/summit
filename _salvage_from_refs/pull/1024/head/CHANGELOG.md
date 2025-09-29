# Changelog

## 2025-08-14 (later)
- feat(realtime): Redis Streams → Socket.IO analytics bridge (`/graph-analytics`) with consumer groups and progressive events
- feat(graphql): Graph Ops schema/resolvers (`expandNeighbors`, `tagEntity`, `requestAIAnalysis`) with validation, RBAC, caching, and metrics
- feat(worker): BullMQ AI worker emitting `ai:insight` to `/realtime` namespace rooms
- feat(observability): Prometheus metrics for expand, AI requests, resolver latency; GraphQL depth limit validation rule
- docs: analytics bridge setup guide

## 2025-08-14
- Added Copilot Goals (UI + GraphQL).
- Added Copilot Query Orchestration (Goal -> Plan -> Tasks -> Results) with live events via Socket.IO.
- Add comprehensive documentation suite (architecture, API, roadmap, project plan).
- Add GitHub issue templates and PR template.
- Add CI workflow (markdownlint + commitlint + Gitleaks).
- Add seeds & migrations for Postgres and Neo4j (initial baseline).
- Add tools to bulk create/update GitHub issues and push bundle via API.
- Generate competitor coverage summary CSV from matrix.
