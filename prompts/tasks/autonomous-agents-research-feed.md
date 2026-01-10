# Autonomous Agents Research Feed Ingestion Update

You are an expert repo-integrator working in the Summit monorepo.

Goal: refine the Autonomous Agents research feed ingestion pipeline to improve parsing robustness,
commit handling, deduplication hashing, idempotent checkpoints, and operational safety while keeping
the existing API and UI compatible.

Scope:

- server/src/ingestion/processors/autonomousAgents.ts
- server/src/ingestion/**tests**/autonomousAgents.test.ts
- server/fixtures/autonomous_agents/sample.md
- .github/workflows/autonomous-agents-ingest.yml
- docs/roadmap/STATUS.json

Constraints:

- Use pnpm for workflows and tooling.
- Preserve existing GraphQL schema and UI contracts.
- Maintain provenance fields and commit SHA tracking.
- Keep changes minimal, production-ready, and fully tested.
