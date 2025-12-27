# IntelGraph Quickstart Deliverable Pack (First Cut)

> **Increment:** Quickstart (generic, placeholder details)
> **Scope Zone:** Documentation (docs/)
> **Status:** Draft v0

## 1) Conductor Summary

**Initiative:** IntelGraph Quickstart (MT SaaS)
**Goal:** Ship a minimal, production-grade slice: ingest → graph → query → observe for one demo tenant, aligned to IntelGraph guardrails.
**Non-Goals:** Advanced ER rules, ML ranking, multi-region DR.
**Constraints:** AWS us-east-1; default retention (standard-365d; PII short-30d); budgets Dev $1k / Stg $3k / Prod $18k (LLM ≤ $5k).
**SLOs:** API p95 ≤ 350ms; writes p95 ≤ 700ms; Neo4j 1-hop p95 ≤ 300ms.
**Assumptions:** OIDC available; Vault for secrets; single write region.
**Risks:** (1) schema drift in ingest; (2) cost overrun with LLM usage.
**Mitigations:** schema registry + contract tests; budget alerts @80%.
**Definition of Done:** Demo tenant can batch ingest CSV → map → dedupe → land in Neo4j/Postgres; query via GraphQL; see traces/metrics/dashboards; CI gates green; canary deploy + rollback verified.

**Provenance:** User prompt (Deliverable Pack draft), repo standards in `docs/maestro/MASTER_PROMPT.md`.
**Verification:** Validate sections align with Output Contract in `docs/maestro/MASTER_PROMPT.md`.
**Cost & SLO Impact:** Baseline targets stated above; needs perf/load validation via k6.
**Tenant & Privacy Posture:** Single demo tenant; PII short-30d; ABAC enforced by tenant claim.

## 2) Backlog & RACI (Snapshot)

| Epic                       | Example Story                                                          | AC (Acceptance Criteria)                                              | Verify                                           | Owner    |
| -------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| Ingest Pipeline            | Ingest-001: “S3/CSV connector maps Person, Organization, Relationship” | 50MB/s/worker; dedupe by (source_id, hash); provenance on             | k6 batch run ≥100k rows/s; manifest hashes match | Data Eng |
| Graph & Relational Storage | Graph-002: “Neo4j schema + constraints”                                | labels & indexes created; 1-hop query p95 ≤300ms on 1M nodes/2M rels  | k6 Cypher load test; p95 report exported         | Platform |
| API & Gateway              | API-003: “GraphQL Query: personById, neighbors, search”                | p95 ≤350ms; ABAC enforced by tenant claim                             | Playwright e2e; OPA policy unit tests            | App Eng  |
| Security & Policy          | Sec-004: “OIDC + mTLS + OPA ABAC seed”                                 | JWKS rotate; deny-by-default; audit trail present                     | policy simulation suite; cert pinning check      | SecEng   |
| Observability & SLOs       | Obs-005: “OTel + Prom/Grafana + alerting”                              | traces for ingest, API; burn alerts wired                             | synthetic error injection; alert fired <2m       | SRE      |
| CI/CD & IaC                | DevEx-006: “CI gates + SBOM + canary”                                  | lint, type, unit, e2e, SBOM, vuln scan; canary 10% with auto-rollback | pipeline run green; rollback exercised           | DevEx    |
| QA & Fixtures              | QA-007: “Acceptance pack & golden data”                                | fixtures (.csv, .json) + expected graph snapshot; reproducible        | nightly job compares hashes; diff < 0.1%         | QA       |

**Provenance:** Backlog snapshot from user-provided scope.
**Verification:** Each epic includes explicit verify hook.
**Cost & SLO Impact:** Cost drivers mainly ingest throughput and LLM budget; add FinOps checks.
**Tenant & Privacy Posture:** Tenant-scoped tests and fixtures.

## 3) Architecture & ADRs

```mermaid
flowchart LR
A[S3 Bucket (CSV)] --> B[Ingest Worker (connector-sdk-s3csv)]
B --> C[Provenance & Mapping]
C --> D[Neo4j Cluster]
C --> E[PostgreSQL (metadata)]
D <---> F[Apollo GraphQL Gateway]
E <---> F
F --> G[Clients (UI/SDK)]
subgraph Security
H[OIDC Provider] --> F
F --> I[OPA/ABAC]
end
F --> J[OTel Traces]
B --> J
J --> K[Prom/Grafana/ELK]
```

**Key ADRs (Draft):**

1. **CSV ingest via S3 connector** to minimize surface area; schema registry to prevent drift.
2. **Neo4j + Postgres split** for graph vs metadata to preserve query performance.
3. **OPA ABAC** enforced at API boundary; deny-by-default.
4. **OTel-first** tracing for ingest and API paths.

**Rollback:** Canary rollback via Helm; DB migrations additive first; feature flags for ingest.

**Provenance:** Diagram derived from current Quickstart flow in prompt.
**Verification:** Review against `docs/maestro/MASTER_PROMPT.md` architecture contract.
**Cost & SLO Impact:** Single region reduces cost; monitor Neo4j p95 under load.
**Tenant & Privacy Posture:** OPA ABAC on gateway; tenant_id scoping.

## 4) Data & Policy

**Entities/Edges (Slice):**

- Person `{id, tenant_id, name, email (FLE), source_refs[], created_at}`
- Organization `{id, tenant_id, name, domain, created_at}`
- Relationship `(:EMPLOYED_BY {since, until, provenance})`
- IngestManifest `{batch_id, hash, source, row_count, errors[]}`

**Retention/Residency:**

- default standard-365d; PII short-30d; legal-hold via tag.
- residency: single region (us-east-1) initial; export signed manifests.

**License/TOS Classes:**

- connector-sdk: MIT-OK; customer data: Proprietary-Client.

**Provenance:** Entity set from prompt; retention rules from defaults.
**Verification:** Validate policy-as-code representations in OPA (see Security section).
**Cost & SLO Impact:** FLE adds overhead; budget for KMS usage.
**Tenant & Privacy Posture:** PII in FLE field; retention class enforced by policy.

## 5) APIs & Schemas

**GraphQL SDL (Slice):**

```graphql
type Person {
  id: ID!
  tenantId: ID!
  name: String!
  email: String @redacted
  orgs(limit: Int = 10): [OrganizationEdge!]!
}

type Organization {
  id: ID!
  tenantId: ID!
  name: String!
  domain: String
}

type OrganizationEdge {
  org: Organization!
  since: String
  until: String
  provenance: String
}

type Query {
  personById(id: ID!): Person
  searchPersons(q: String!, limit: Int = 20): [Person!]!
  neighbors(personId: ID!, hop: Int = 1, limit: Int = 50): [Person!]!
}

type Mutation {
  ingestBatch(s3Url: String!, mappingId: ID!): IngestResult!
}

type IngestResult {
  batchId: ID!
  accepted: Int!
  rejected: Int!
  manifestHash: String!
}
```

**Cypher (cost-aware):**

```cypher
PROFILE MATCH (p:Person {id:$id, tenant_id:$tid}) RETURN p;
PROFILE MATCH (p:Person {id:$id, tenant_id:$tid})-[]-(n:Person {tenant_id:$tid})
RETURN n LIMIT $limit;
```

**Postgres (parameterized):**

```sql
CREATE TABLE ingest_manifest(
  batch_id uuid PRIMARY KEY,
  source text,
  hash text,
  row_count int,
  created_at timestamptz default now()
);
```

**Provenance:** SDL/Cypher/SQL from prompt.
**Verification:** Persisted query checks + schema check (see Testing Strategy).
**Cost & SLO Impact:** PROFILE indicates query costs; enforce pagination/limits.
**Tenant & Privacy Posture:** tenant_id required on all entities; redaction directive on email.

## 6) Security & Privacy

**AuthN:** OIDC (JWT, JWKS rotation); mTLS between services.
**AuthZ:** OPA/ABAC: tenant_id match + purpose tags.
**Secrets:** Vault; short-lived DB creds.
**Encryption:** Field-level for email; KMS envelope keys.
**Audit/Provenance:** Immutable ledger per batch (hash chain).

**OPA Seed (example):**

```rego
package authz

default allow = false
allow {
  input.jwt.tenant == input.resource.tenant
  input.action == "read"
}
```

**Provenance:** Security posture based on default guardrails.
**Verification:** OPA policy tests + mTLS health checks.
**Cost & SLO Impact:** mTLS adds handshake cost; cache JWKS.
**Tenant & Privacy Posture:** deny-by-default; purpose binding.

## 7) Provenance & Audit

**Claim/Evidence Model:**

- Claim: `IngestBatchAccepted`
- Evidence: `manifestHash`, `source`, `rowCount`, `transformSteps`.

**Manifest Format (YAML):**

```yaml
inputs:
  - s3://bucket/path.csv
transforms:
  - mapping_id: quickstart-v0
  - dedupe: source_id+hash
outputs:
  - neo4j: Person, Organization, EMPLOYED_BY
  - postgres: ingest_manifest
hash: sha256:...
```

**Audit Hooks:** log all ingest decisions requiring compliance review.

**Provenance:** Derived from governance requirement in root AGENTS.
**Verification:** Hash chain verification; compare manifest hashes during QA.
**Cost & SLO Impact:** Hash computation adds minor overhead per batch.
**Tenant & Privacy Posture:** manifest scoped to tenant_id.

## 8) Testing Strategy

**Unit:** mappers, ABAC policies, resolvers.
**Contract:** GraphQL persisted queries; OPA policy tests.
**E2E:** Playwright flows (ingest → query → dashboard).
**Load:** k6 API and Cypher targets to SLOs.
**Chaos:** pod kill for API/ingest; verify burn alerts.
**Coverage Targets:** ≥85% critical paths; ≥95% policy evaluation.

**Provenance:** Testing standards from repo guidelines.
**Verification:** Use `pnpm test`, `pnpm e2e`, `k6 run` with thresholds.
**Cost & SLO Impact:** Load tests size for Neo4j p95 target.
**Tenant & Privacy Posture:** Use synthetic fixture data only.

## 9) Observability & SLOs

**Metrics:** API latency p50/p95/p99, error rate; ingest throughput; Neo4j query timings.
**Logs:** JSON structured; correlation IDs; PII redaction.
**Traces:** OTel spans across ingest → graph → API.
**Alerts:** Error budget burn, latency SLO breach, ingest backlog, replica lag.

**Provenance:** Observability stack from project defaults.
**Verification:** Inject synthetic errors and confirm alert triggers.
**Cost & SLO Impact:** Telemetry overhead ~1–3%; budget for metrics volume.
**Tenant & Privacy Posture:** Redaction on PII fields before export.

## 10) CI/CD & IaC

**Pipelines:** lint → typecheck → unit → contract → e2e → SBOM → vuln → policy-sim → perf-smoke.
**Envs:** dev/stg/prod with Helm values overlays; Terraform modules for VPC, Neo4j, Postgres, OPA, Grafana.
**Deploy:** canary 10% / 5m / auto-rollback on SLO breach; release tags `vX.Y.Z` with evidence bundle.

**Provenance:** CI gates in `docs/CI_STANDARDS.md`.
**Verification:** `pnpm lint`, `pnpm typecheck`, `pnpm test` in pipeline.
**Cost & SLO Impact:** Canary reduces blast radius; include perf-smoke thresholds.
**Tenant & Privacy Posture:** per-tenant env overlays; do not ship demo data to prod.

## 11) Code & Scaffolds (Runnable Slices)

**Minimal Slice (paths):**

- `server/src/ingestion/` — CSV ingest worker (S3 → mapping → dedupe).
- `server/src/policies/` — OPA ABAC policies.
- `server/src/services/` — GraphQL resolvers for personById/neighbors/search.
- `server/db/migrations/postgres/` — `ingest_manifest` schema.

**Run/Test Steps:**

1. `pnpm install`
2. `pnpm run dev`
3. `pnpm test`
4. `pnpm run test:e2e`

**Provenance:** Scaffolds align to repo conventions.
**Verification:** Start dev stack and confirm ingest/query success.
**Cost & SLO Impact:** None beyond standard dev runtime.
**Tenant & Privacy Posture:** Seed data only in dev/stg.

## 12) Release Notes & Runbooks

**Release Notes (Draft):**

- Added Quickstart deliverable pack (documentation).
- Defined MVP ingestion → graph → query → observe path.

**Runbooks (Draft):**

- **Rollback:** Helm rollback to previous revision; revert feature flag for ingest.
- **DR (Single-region):** snapshot backups to S3; restore instructions.
- **On-call:** check SLO alerts, ingest backlog, Neo4j heap metrics.

**Provenance:** Runbook structure from repo operations guidance.
**Verification:** Runbook dry-run in staging.
**Cost & SLO Impact:** Snapshot storage cost; rollback minimizes downtime.
**Tenant & Privacy Posture:** No PII in release notes; runbook avoids sensitive logs.

## 13) Assumptions Log & Risks

**Assumptions:**

- OIDC provider is available and reliable.
- Vault is the system of record for secrets.
- Single write region is acceptable for Quickstart.

**Risks & Mitigations:**

1. **Schema drift in ingest** → schema registry + contract tests + mapping version pin.
2. **LLM cost overrun** → budget alerts @80% + per-tenant usage caps.
3. **Neo4j performance** → index verification + load testing pre-release.

**Kill Criteria:**

- Cannot meet p95 SLOs after two optimization cycles.
- PII retention controls cannot be expressed as policy-as-code.

**Provenance:** Risks from user prompt.
**Verification:** Track in sprint issues; monitor via dashboards.
**Cost & SLO Impact:** Explicit risk to error budget and cost caps.
**Tenant & Privacy Posture:** ABAC enforcement and retention tags required before prod.
