# @summit/summit-praxeology

Praxeology Graph (PG) module for Summit with **analytic/defensive-only** safeguards.

## Guarantees

- PG outputs are non-prescriptive hypotheses (fit + evidence gaps), never recommendations.
- PG writes are quarantined in a `PG` WriteSet envelope and explicitly blocked from direct Reality Graph promotion.
- JSON Schema (AJV) + semantic validation enforce policy guardrails.

## Local commands

```bash
pnpm --filter @summit/summit-praxeology test
pnpm --filter @summit/summit-praxeology build
pnpm --filter @summit/summit-praxeology dev:pg
```

## API (demo service)

- `GET /healthz`
- `GET /pg/fixtures`
- `POST /pg/validate-playbook`
- `POST /pg/validate-action-signature`
- `POST /pg/validate-writeset`
- `GET /pg/quarantine`
- `POST /pg/match`

## Deployment ladder (not laptop-limited)

### Tier 1: Laptop / Devbox
- Run `dev:pg` with in-memory quarantine.

### Tier 2: Single-node cloud (EC2/GCE/Bare metal VM)
- Containerize `pgServe`.
- Persist quarantine payloads in Postgres or object storage.
- Place behind reverse proxy with auth.

### Tier 3: Kubernetes / Multi-node
- Deploy API as stateless replicas.
- Back quarantine with durable datastore.
- Add queue-based ingestion and materialized hypothesis views.
- Enforce policy checks at ingress and write gate.

### Tier 4: Sovereign / Enterprise
- Tenant-isolated quarantine stores.
- Signed WriteSet provenance and immutable audit logs.
- Human-reviewed promotion workflow to “analytically accepted” views (still non-RG).
