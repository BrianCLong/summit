# IntelGraph — Workstream Starter Pack (v0.1)

This pack scaffolds starter artifacts for the 8 parallel workstreams. Copy files into your repo as-is, then iterate.

> **Repo root suggestion**
>
> ````text
> .
> ├─ docs/
> ├─ adr/
> ├─ backlog/
> ├─ data/
> ├─ ingest/
> ├─ policy/
> ├─ datasets/golden/
> ├─ api/graphql/
> ├─ services/api/
> ├─ policies/opa/
> ├─ idp/
> ├─ security/
> ├─ provenance/
> ├─ exports/
> ├─ services/provenance-cli/
> ├─ tests/
> ├─ load/k6/
> ├─ chaos/scenarios/
> ├─ observability/{dashboards,alerts}/
> ├─ runbooks/
> └─ .github/workflows/
> ````

---

## 1) Conductor Summary, Backlog & RACI

### `docs/conductor-summary.md`
```md
# Conductor Summary — Release N+1

## Goal
-

## Non-Goals
-

## Assumptions
-

## Constraints
- SLOs: API reads p95 ≤ 350 ms; writes p95 ≤ 700 ms; subs p95 ≤ 250 ms.
- Graph ops: 1-hop p95 ≤ 300 ms; 2–3 hop p95 ≤ 1,200 ms.
- Cost: Dev ≤ $1k/mo; Stage ≤ $3k/mo; Prod ≤ $18k/mo; LLM ≤ $5k/mo; alert at 80%.
- Cadence: trunk-based; weekly cut → staging; biweekly → prod; tags vX.Y.Z.

## Risks & Mitigations
- [ ] Risk:  
  Mitigation:

## Definition of Done
- [ ] All AC met with evidence (tests, metrics, logs, provenance)
- [ ] SLO/cost burn ≤ thresholds
- [ ] Runbooks and dashboards updated
```

### `backlog/backlog.json`
```json
{
  "$schema": "https://intelgraph.example/schemas/backlog-1.json",
  "version": "0.1",
  "epics": [
    {
      "id": "E-001",
      "title": "",
      "priority": "Must",
      "stories": [
        {
          "id": "S-001-01",
          "title": "",
          "owner": "",
          "depends_on": [],
          "acceptance_criteria": [
            "Given X when Y then Z",
            "Evidence: test IDs, metrics, logs"
          ],
          "verification": [
            {"type": "unit", "ref": "tests/unit/..."},
            {"type": "load", "ref": "load/k6/..."},
            {"type": "policy-sim", "ref": "policies/opa/tests/..."}
          ],
          "evidence_hooks": [
            {"metric": "api_latency_p95_ms", "slo": 350},
            {"metric": "ingest_throughput_mb_s", "slo": 50}
          ]
        }
      ]
    }
  ]
}
```

### `docs/raci.md`
```md
| Deliverable                         | R | A | C            | I                      | Target Week |
|------------------------------------|---|---|--------------|------------------------|-------------|
| Conductor Summary                  | PM| MC| Arch, Sec    | SRE, Data, QA          | Wk 1        |
| Backlog + AC + Verification        | PM| MC| Leads        | All                    | Wk 1        |
| RACI Published                     | PM| MC|              | All                    | Wk 1        |
```

---

## 2) Architecture, ADRs & Threat Model

### `docs/architecture.md`
```md
# Architecture Overview

```mermaid
flowchart LR
  client[Client Apps]
  gw[API/GraphQL Gateway]
  opa[OPA/ABAC]
  api[API Service (TS/Apollo)]
  pg[(PostgreSQL)]
  neo[(Neo4j Cluster)]
  redis[(Redis)]
  kfk[(Kafka)]
  otel[OpenTelemetry]

  client --> gw --> api
  api --> opa
  api --> pg
  api --> neo
  api --> redis
  api <-->|sub| kfk
  api --> otel
```

## Regions & Tenancy
- Default: SaaS multi-tenant with ABAC scoping.

## Rollback
- Canary + automated revert on SLO breach or error budget burn > 20%/hr.
```

### `adr/ADR-000-template.md`
```md
# ADR-000: Title

- Status: Proposed
- Date: 2025-09-26
- Context:
- Decision:
- Consequences:
- Alternatives:
- Rollback Plan:
- Evidence: metrics/tests/links
```

### `security/threat-model.md`
```md
# Threat Model (STRIDE)

## Assets & Boundaries
-

## STRIDE Analysis
- Spoofing: WebAuthn; mTLS; OIDC
- Tampering: append-only audit; signed exports
- Repudiation: immutable ledger
- Information Disclosure: ABAC/OPA; FLE for sensitive fields
- Denial of Service: rate limits; quotas; autoscale
- Elevation of Privilege: least-privilege; policy sim in CI

## Abuse/Misuse Cases
-

## Controls Mapping
-
```

---

## 3) Data Model, Retention & Ingest

### `data/graph-schema.cypher`
```cypher
// Labels & Keys
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email);

// Example relationship
// (:User)-[:INTERACTED_WITH {ts: datetime(), source: "s3csv"}]->(:Entity)
```

### `data/entity-catalog.md`
```md
# Entity Catalog

## Entities
- User {id: string!, email: string?, pii: true}
- Entity {id: string!, type: string}

## Edges
- INTERACTED_WITH {ts: datetime, source: string}
```

### `ingest/specs/s3csv.yaml`
```yaml
version: 1
source: s3://bucket/prefix/
schema_map:
  user_id: id
  user_email: email
  entity_id: entityId
  event_ts: ts
  source: source
options:
  dedupe_keys: [user_id, entity_id, event_ts]
  provenance_attach: true
  batch_size_mb: 64
slo:
  throughput_mb_s_per_worker:
    target: 50
  prestorage_processing_ms_p95: 100
```

### `policy/retention.yaml`
```yaml
version: 1
default: standard-365d
labels:
  User:
    pii: true
    retention: short-30d
    legal_hold_supported: true
  Entity:
    retention: standard-365d
purposes:
  - investigation
  - threat-intel
```

### `datasets/golden/README.md`
```md
# Golden Dataset
- Deterministic fixtures used for smoke/load tests and reproducibility.
```

---

## 4) API/GraphQL Contracts & Resolvers

### `api/graphql/schema.graphql`
```graphql
schema { query: Query, mutation: Mutation, subscription: Subscription }

type Query {
  user(id: ID!): User @auth(scope: "tenant:user:read")
}

type Mutation {
  upsertUser(input: UpsertUserInput!): User @auth(scope: "tenant:user:write")
}

type Subscription {
  userEvents(userId: ID!): UserEvent @auth(scope: "tenant:user:read")
}

type User { id: ID!, email: String }

input UpsertUserInput { id: ID!, email: String }

type UserEvent { type: String!, ts: String! }
```

### `api/graphql/persisted-queries.json`
```json
{
  "GetUserById:v1": "query($id:ID!){ user(id:$id){ id email } }"
}
```

### `services/api/src/resolvers/user.ts`
```ts
import { Context } from "../types";

export const Query = {
  async user(_: unknown, { id }: { id: string }, ctx: Context) {
    ctx.auth.require("tenant:user:read", { id });
    const res = await ctx.neo.run(`MATCH (u:User {id:$id}) RETURN u LIMIT 1`, { id });
    return res.records[0]?.get("u");
  }
};
```

### `tests/contract/api/user.spec.ts`
```ts
describe("contract:GetUserById", () => {
  it("returns shape and honors auth", async () => {
    // TODO: implement
  });
});
```

---

## 5) Security, Privacy & Identity

### `policies/opa/abac.rego`
```rego
package abac

default allow = false

allow {
  input.user.tenant == input.resource.tenant
  input.user.scopes[_] == input.action
}
```

### `policies/opa/tests/abac_test.rego`
```rego
package abac

test_allow_same_tenant_read {
  allow with input as {
    "user": {"tenant": "t1", "scopes": ["tenant:user:read"]},
    "resource": {"tenant": "t1"},
    "action": "tenant:user:read"
  }
}
```

### `idp/oidc-config.md`
```md
# OIDC Configuration
- Provider: <fill>
- Scopes: openid, email, profile, offline_access
- JWKS cache ttl: 10m
```

### `security/pii-catalog.md`
```md
# PII Catalog
- User.email — sensitive — FLE enabled — retention: short-30d
```

---

## 6) Provenance, Audit & Signed Exports

### `provenance/schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ClaimEvidence",
  "type": "object",
  "properties": {
    "claimId": {"type": "string"},
    "subject": {"type": "string"},
    "evidence": {
      "type": "array",
      "items": {"type": "object", "properties": {"hash": {"type": "string"}, "ts": {"type": "string"}}}
    }
  },
  "required": ["claimId", "subject", "evidence"]
}
```

### `exports/manifest-spec.md`
```md
# Export Manifest Spec
- Content hashes (SHA-256)
- Source→transform chain
- Signatures & public key refs
```

### `services/provenance-cli/README.md`
```md
# provenance-cli
Commands: hash, sign, verify
```

---

## 7) Testing Strategy & Quality Gates

### `tests/README.md`
```md
- Unit (Jest)
- Integration (Jest)
- E2E (Playwright)
- Security/Misuse
```

### `load/k6/smoke.js`
```js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 10, duration: '1m' };

export default function () {
  const res = http.post(__ENV.API_URL, JSON.stringify({query: 'query($id:ID!){user(id:$id){id}}', variables: {id: 'u1'}}), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### `chaos/scenarios/pod-restart.md`
```md
# Chaos: API Pod Restart
- Hypothesis: SLOs hold; no error-budget burn > 5% during restart window.
```

---

## 8) Observability, SRE, CI/CD & Cost

### `.github/workflows/ci.yml`
```yaml
name: ci
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm test -- --ci
      - run: npm run sbom:generate
      - name: Policy Simulation
        run: npm run policy:simulate
```

### `observability/dashboards/api-latency.json`
```json
{ "title": "API Latency p95", "panels": [] }
```

### `observability/alerts/slo-burn.yaml`
```yaml
groups:
- name: slo
  rules:
  - alert: APISLOBurn
    expr: predict_linear(api_errors_total[30m], 1*60*60) > (0.001 * api_requests_total)
    for: 5m
    labels: { severity: page }
    annotations: { summary: "API error budget burn > 0.1%" }
```

### `runbooks/api-5xx-burst.md`
```md
# Runbook: API 5xx Burst
1) Check p95 latency & error rate dashboards
2) Correlate with deploys; auto-rollback if threshold breached
3) Inspect logs/traces; isolate service; open incident
```

