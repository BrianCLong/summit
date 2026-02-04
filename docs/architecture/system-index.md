# Summit System Index (Minimal)

This is the canonical, versioned system index for Summit. It is intentionally constrained to the
minimum viable architecture map required for governance, provenance, and agent orchestration.
`system-index.json` is validated against `system-index.schema.json` to keep the machine definition
deterministic.

## Authority & Readiness

Summit operates under the binding Summit Readiness Assertion and governance constitution. All
components and flows below are aligned to these authorities; exceptions must be recorded as
Governed Exceptions with explicit authority references.

- Readiness authority: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance authority: `docs/governance/CONSTITUTION.md`
- Meta-governance: `docs/governance/META_GOVERNANCE.md`
- Agent mandates: `docs/governance/AGENT_MANDATES.md`
- GA hardening contract: `agent-contract.json`

## Component Index

| ID                   | Name                   | Type           | Path               | Primary Dependencies                      |
| -------------------- | ---------------------- | -------------- | ------------------ | ----------------------------------------- |
| summit.web           | Summit Web Application | frontend       | `apps/web/`        | summit.api, summit.graph                  |
| summit.api           | Summit API Server      | service        | `server/`          | summit.graph, summit.postgres, summit.opa |
| summit.graph         | IntelGraph Core        | graph-service  | `graph-service/`   | summit.neo4j                              |
| summit.opa           | OPA Policy Engine      | policy-engine  | `opa/`             | none                                      |
| summit.postgres      | PostgreSQL             | database       | `db/`              | none                                      |
| summit.neo4j         | Neo4j                  | graph-database | `db/`              | none                                      |
| summit.orchestration | Maestro Orchestration  | orchestrator   | `orchestration/`   | summit.api                                |
| summit.agents        | Agent Runtime & Specs  | agent-runtime  | `agents/`          | summit.orchestration                      |
| summit.governance    | Governance Controls    | governance     | `docs/governance/` | none                                      |

## Flow Index (Provenance Required)

| ID                 | Source     | Target       | Contracts         | Data                    |
| ------------------ | ---------- | ------------ | ----------------- | ----------------------- |
| flow.web-to-api    | summit.web | summit.api   | CONSTITUTION      | graphql, authn          |
| flow.api-to-graph  | summit.api | summit.graph | PROVENANCE_SCHEMA | entities, relationships |
| flow.api-to-policy | summit.api | summit.opa   | RULEBOOK          | policy, decision        |

## Query Primitives

These queries are first-class and aligned to the system-of-systems view. Results must be surfaced
from `system-index.json` or graph projections using `summit-graph.schema.json`.

- `who-can-touch-branch-protection`: roles → permissions → resources
- `what-depends-on-graph`: components → dependency
- `what-requires-provenance`: flows → contracts

## Governance Guards (Immediate)

1. Any change to component or flow definitions must update `system-index.json` and this document
   in the same commit.
2. Policy enforcement is authoritative; if drift is detected, report as a Governed Exception and
   resolve via the policy engine.
3. Architecture updates are deterministic and versioned; untracked changes are rejected by design.

## Next Enforced Additions (Deferred Pending Authority)

- `governance.state` and `governance.schema` for drift detection (deferred pending explicit
  governance approval).
- Global agent scheduler model with SLA-aware dependencies (deferred pending orchestration
  authority alignment).
