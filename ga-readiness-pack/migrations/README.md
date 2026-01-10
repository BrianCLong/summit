This directory contains the migration plan and evidence.

## Index of Migrations

The following directories contain the source of truth for migrations:
- **Postgres:** `server/src/db/migrations/postgres` and `server/db/migrations/postgres`
- **Neo4j:** `server/src/db/migrations/neo4j` and `server/db/migrations/neo4j`
- **TypeScript Orchestration:** `server/src/migrations`

## Execution Plan (MVP-4)

1.  **Pre-Deployment:**
    - Run `scripts/compliance/check_drift.ts` to ensure no schema drift.
    - Backup databases.

2.  **Deployment (Gate 1):**
    - Run `npm run db:migrate` (Sequelize/TypeORM migrations).
    - Run `npx ts-node scripts/migrate.ts` (Neo4j constraints).

3.  **Post-Deployment (Backfill):**
    - Execute `server/src/jobs/backfill_provenance.ts` (idempotent).

## Rollback Scripts
- Located in `server/db/migrations/postgres/*.down.sql`.
- Neo4j rollback involves dropping new constraints manually if needed (see `server/db/migrations/neo4j/*.cypher`).
