# Repo Assumptions Log (OSINT Playbook Runner)

## Scope
This log captures what is **verified** vs **assumed** in the OSINT playbook runner plan, plus a
pre-merge checklist and a must-not-touch list. It is specific to the Summit repository and should
be updated as validation completes.

## Verified (from repository inspection)
- **Package manager + scripts**: `pnpm` is declared as the package manager and scripts exist for
  `lint`, `test`, `build`, and `typecheck` in the root `package.json`.
- **Workflows layout**: GitHub workflows live under `.github/workflows/` with reusable workflows
  prefixed by `_reusable-`.
- **Source root**: A top-level `src/` directory exists with many modules, including `src/agents/`.
- **Governance provenance artifacts**: A root `PROVENANCE_SCHEMA.md` exists (governance provenance
  schema is documented).

## Assumed (pending validation)
- **OSINT module layout**: `src/osint/` does not appear in the current `src/` listing; the proposed
  OSINT modules (`src/osint/schema`, `src/osint/playbooks`, etc.) are assumptions pending creation.
- **Connector structure**: `src/connectors/` does not appear in the current `src/` listing; any
  connector standardization for OSINT tools will need explicit verification or creation.
- **GraphRAG module**: `src/graphrag/` does not appear in the current `src/` listing; any GraphRAG
  placement will require a new module or reuse of existing graph-related directories.
- **Evidence schema conventions**: Evidence schema conventions beyond `PROVENANCE_SCHEMA.md` require
  confirmation (e.g., existence of prior OSINT evidence schemas or normalization contracts).
- **Neo4j/Qdrant/Postgres wiring**: Environment variable naming and client wiring for Neo4j/Qdrant/
  Postgres need validation in server/config docs before integrating OSINT storage.
- **Tool abstraction layer**: A formal agent tool abstraction layer for OSINT tools needs discovery
  (if present) or creation.

## Pre-merge Validation Checklist
1. Confirm `pnpm` scripts for `lint`, `test`, `build`, `typecheck`, and the CI check names used in
   `.github/workflows/`.
2. Confirm module layout for any existing OSINT, connector, or graph-intent logic in `src/` and
   `packages/`.
3. Confirm evidence schema conventions and logging expectations for new artifacts.
4. Confirm how Neo4j/Postgres (and any vector DB) are configured (env var names, clients, pools).
5. Confirm whether a tool abstraction layer exists for agents and how adapters should register.

## Must-Not-Touch List (without explicit approval)
- Governance policy files or gate enforcement (`docs/governance/**`, `scripts/ci/**`,
  `.github/workflows/**`) beyond documentation-only additions.
- Security or compliance controls (OPA rules, security gates, evidence verification logic).
- Production deployment, auth, or credential-handling code.
- Any files that carry regulatory or legal policy language.

## Update Log
- 2026-02-08: Initial capture for OSINT playbook runner planning.
