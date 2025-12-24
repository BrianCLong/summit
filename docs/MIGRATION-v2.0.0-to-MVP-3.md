# Migration Guide: v2.0.0 → MVP-3

**Audience:** Platform engineers and SREs upgrading an existing Summit v2.0.0 deployment to MVP-3.
**Goal:** Preserve data and golden-path workflows while adopting the AI/Kafka optional stack and new governance controls.

## Highlights & Breaking Changes
- **Service graph refresh:** Gateway and GraphQL schemas gained stricter nullability; run `pnpm graphql:schema:check` before deploying.
- **Kafka-first pipelines:** Stream ingestion defaults to Kafka topics (`streams.cases`, `streams.entities`) instead of Redis queues. Enable the Kafka profile or set `STREAM_TRANSPORT=redis` to retain legacy behavior.
- **Authentication headers:** REST routes reject legacy `X-Auth-Token`; use `Authorization: Bearer <jwt>` only.
- **Config normalization:** Environment variables move to `CONFIG_` prefixes (`CONFIG_GRAPH_DB_URI`, `CONFIG_REDIS_URI`). Old names are deprecated and will be removed in GA.
- **OpenAPI/GraphQL outputs are generated artifacts:** The new CI job (`api-docs-sync`) blocks merges when specs drift from source.

## Deprecations (remove by GA)
- `POST /api/ingest/start` with `sourceType=legacy` → replace with `pipelineId`.
- Redis-only queues for ingest and triage → migrate to Kafka topics or set explicit `STREAM_TRANSPORT=redis` with an exception ticket.
- UI feature flag `enableLegacyCopilot` → replace with `copilot.mode=v2`.
- `.env` secrets named `JWT_SECRET_DEFAULT` → rename to `JWT_SECRET`/`JWT_REFRESH_SECRET`.

## Pre-Flight Checklist
1. Snapshot Postgres + Neo4j and export topic offsets (if Kafka already enabled).
2. Copy `.env` to `.env.backup` and update to the new `CONFIG_` keys.
3. Run `./scripts/validate-env.sh` and `npm run quickstart -- --ai --kafka --no-dev` in a staging clone.
4. Regenerate docs: `./scripts/generate-docs.sh` and confirm clean `git status`.

## Step-by-Step Upgrade
1. **Install & bootstrap:** `make bootstrap && docker compose -f docker-compose.dev.yml up -d postgres neo4j redis kafka`.
2. **Migrate data:** `npm run db:migrate && npm run db:seed` (seeds now include Kafka topic bindings).
3. **Flip transport:** set `STREAM_TRANSPORT=kafka` (or leave `redis` for phased rollout) and restart API + workers.
4. **Redeploy clients:** `pnpm run build` or redeploy images so UI picks up the new GraphQL schema.
5. **Validate:**
   - `make smoke`
   - `pnpm graphql:schema:check`
   - `curl :4000/api/docs/openapi.json | jq '.info.version'`
6. **Cutover:** enable `copilot.mode=v2` flag, remove `enableLegacyCopilot`, and monitor for 30 minutes.

## Rollback Plan
- Revert to v2.0.0 images and restore `.env.backup` keys.
- Reset Kafka offsets to the snapshot and switch `STREAM_TRANSPORT=redis`.
- Run `npm run db:rollback` if the deploy introduced schema drift.

## Validation & Evidence
- CI: `api-docs-sync`, `ci-lint-and-unit`, and `ci-golden-path` green.
- Runtime: `/health/detailed` returns OK; Grafana dashboard **Summit Golden Path** within SLO; smoke tests pass end-to-end with AI/Kafka profile enabled.
