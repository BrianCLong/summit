# Repo Assumptions Log (OSINT Playbook Runner)

## Scope

This log captures what is **verified** vs **deferred pending validation** for the OSINT Playbook
Runner plan, plus an evidence-backed checklist and a must-not-touch list.

## Readiness Assertion Reference

- **Summit Readiness Assertion**: all readiness language is anchored to
  `docs/SUMMIT_READINESS_ASSERTION.md`.

## Authority Alignment

- **Canonical governance sources**: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`, `docs/governance/AGENT_MANDATES.md`, and `docs/ga/**`.
- **Governed Exceptions model**: any legacy bypass is represented as a Governed Exception with
  rationale, gate owner, rollback trigger, and expiry.

## Verified (Evidence-backed)

| Topic                          | Status   | Evidence command(s)                              | Present-state finding                                                                          |
| ------------------------------ | -------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Package manager + core scripts | Verified | `cat package.json`                               | Root uses `pnpm@10.0.0`; scripts include `lint`, `test`, `build`, `typecheck`.                 |
| Workflow layout                | Verified | `ls .github/workflows`                           | Workflows are under `.github/workflows/`; reusable files use `_reusable-*.yml`.                |
| CI standard anchor             | Verified | `rg -n 'pr-quality-gate' docs .github/workflows` | `pr-quality-gate.yml` is referenced as CI standard in docs.                                    |
| Source module root             | Verified | `ls src`                                         | `src/` exists with `agents/`, `collector/`, `graph/`, `mcp/`, `tools/` and many other modules. |
| Provenance governance artifact | Verified | `ls`                                             | `PROVENANCE_SCHEMA.md` exists at repo root.                                                    |
| Boundary check script          | Verified | `node scripts/check-boundaries.cjs`              | Boundary checker executes and reports no zone violations.                                      |

## Deferred pending validation (blocking for implementation start)

| Topic                                       | Deferred condition                                                                                                                                            | Validation owner           | Exit criteria                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/osint/**` layout                       | `src/osint/` not currently present in root `src/` listing.                                                                                                    | OSINT implementation owner | Directory + module contracts created and linked in architecture docs.                           |
| Connector placement for OSINT adapters      | `src/connectors/` is not present in root `src/`.                                                                                                              | Connector SDK owner        | Confirm canonical adapter location (`server/`, `packages/connector-sdk`, or `src/osint/tools`). |
| GraphRAG placement                          | `src/graphrag/` not present in root `src/`.                                                                                                                   | Graph platform owner       | Confirm whether OSINT correlation lands in existing graph modules or new package.               |
| Evidence schema conventions for OSINT       | No dedicated OSINT schema contract found in this pass.                                                                                                        | Governance evidence owner  | Approved schema path + validator gate committed.                                                |
| Neo4j/Qdrant/Postgres runtime wiring        | `DATABASE_URL`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` appear in tests; Qdrant env wiring not yet validated.                                             | Runtime/data owner         | Documented env contract and runtime client paths for all required stores.                       |
| Tool abstraction layer for OSINT collectors | Multiple tool abstractions exist (`src/mcp/types.ts`, `packages/agent-runtime`, `packages/connector-sdk`), but no single declared OSINT adapter contract yet. | Agent platform owner       | Chosen abstraction documented with registration and policy constraints.                         |

## Pre-merge validation checklist (implementation gate)

1. Confirm CI-required check names and job mapping in `pr-quality-gate.yml` and governance checks.
2. Confirm canonical OSINT module path and avoid duplicate abstractions across `src/`, `server/`, and
   `packages/`.
3. Publish OSINT evidence schema + policy rule (`no assertion without provenance`) before adapter
   integration.
4. Confirm runtime env contracts for Neo4j/Postgres/vector store and redact-sensitive logging rules.
5. Confirm tool registration path aligns with MCP/tool registry controls and policy gates.
6. Confirm every artifact references readiness and canonical governance definitions.

## Must-not-touch list (without explicit governance approval)

- Policy enforcement logic and gate controls (OPA/policy code, CI gate scripts, required-check logic).
- Security/compliance guardrails and secrets/auth handling paths.
- Production deployment and trust-root/credential material.
- Canonical readiness/governance authority files except explicit owner-approved updates.

## Execution evidence snapshot (this update)

- `rg -n 'pr-quality-gate|CI_STANDARDS|required-checks' docs .github/workflows | head -n 20`
- `rg -n 'QDRANT|NEO4J|POSTGRES|DATABASE_URL' src server packages | head -n 40`
- `rg -n 'interface .*Tool|ToolRegistry|tool registry|tool abstraction' src packages | head -n 40`
- `node scripts/check-boundaries.cjs`
- `node -e "JSON.parse(require('fs').readFileSync('docs/roadmap/STATUS.json','utf8')); console.log('STATUS.json valid')"`

## Update log

- 2026-02-08: Initial assumptions log created.
- 2026-02-08: Evidence-backed validation matrix added; deferred items converted to owner + exit
  criteria gates for clean/green OSINT implementation start.
