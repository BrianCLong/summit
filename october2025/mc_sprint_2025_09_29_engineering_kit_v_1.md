````md
# Maestro Conductor (MC) — Engineering Kit _(v1.0.0)_

**Slug:** `mc-sprint-2025-09-29-engineering-kit-v1`  
**Date:** 2025-09-29 (America/Denver)  
**Scope:** Threat model, C4 sketches, data lifecycle, audit/event schemas, telemetry conventions, DB schema, migrations, local dev stack, test strategy, error‑budget policy, rollout/incident playbooks, and helper scripts. All artifacts are copy‑pasteable and align to the sprint plan.

---

## 1) Threat Model (STRIDE)

`docs/security/MC_THREAT_MODEL.md`

```md
# MC Threat Model — v1

## Assets

- Workflow manifests, execution inputs/outputs, receipts (signed), policy bundles, secrets, signing keys, audit trail.

## Entry Points

- REST API (`/api/workflows`, `/api/executions`), CLI tokens, OPA PDP, object storage, CI/CD supply chain.

## STRIDE Table (top risks)

| STRIDE                 | Vector                             | Control                                                                          | Residual Risk |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------- | ------------- |
| Spoofing               | Stolen token used on control plane | OIDC + mTLS between CLI→API, step‑up (WebAuthn) for publish/execute              | Low           |
| Tampering              | Receipt alteration at rest         | S3 Object Lock (WORM) + cosign signatures + digest indexing                      | Low           |
| Repudiation            | Actor denies publish/execute       | Non‑repudiation: OIDC subject + signed receipts + audit events                   | Low           |
| Info Disclosure        | PII in task inputs                 | OPA PII pack denies + redaction lib + secrets vault                              | Medium        |
| DoS                    | Abusive executions                 | Quotas/runner classes + budgets + rate limits                                    | Medium        |
| Elevation of Privilege | Runner escape                      | Container hardening (seccomp/apparmor), non‑root, read‑only FS, network policies | Medium        |

## Trust Boundaries

- Public internet ↔ API Gateway ↔ Control plane ↔ Runners ↔ External services (S3, DB, OPA).

## Abuse Cases

- "Budget smuggling" via many cheap tasks → mitigation: per‑run + per‑tenant cost budget & anomaly alerts.
- "Policy bypass" via local plan only → mitigation: server‑side re‑validation & policy eval on execute.
```
````

---

## 2) C4 Diagrams (Mermaid)

`docs/architecture/c4.md`

````md
## Context

```mermaid
C4Context
title MC Context
Person(user, "Composer/Operator")
System_Boundary(mc, "Maestro Conductor"){
  System(api, "MC API")
  System(runners, "Runners")
  System(policy, "OPA PDP")
}
SystemDb(db, "Postgres")
System(s3, "Object Storage")
Rel(user, api, "Publish/Dry‑run/Execute")
Rel(api, db, "store metadata")
Rel(api, s3, "store receipts, bundles")
Rel(api, policy, "evaluate")
Rel(api, runners, "schedule")
```
````

## Container

```mermaid
C4Container
Container(api, "mc-api", "Node/Go", "Control plane")
Container(worker, "mc-runner", "Go", "Task executor")
Container(opa, "OPA PDP", "Rego", "Policy")
Container(graf, "Observability", "Prom+Grafana", "metrics/logs/traces")
ContainerDb(pg, "Postgres", "RDS")
Container(s3, "ObjectStore", "S3 compatible")
Rel(api, pg, "SQL")
Rel(api, s3, "PUT receipts, bundles")
Rel(api, opa, "Policy eval (bundle)")
Rel(api, worker, "Queue/schedule")
Rel(worker, s3, "PUT step logs")
```

````

---

## 3) Data Lifecycle & Classification
`docs/data/MC_DATA_LIFECYCLE.md`
```md
# Data Classes
- Public (docs, schemas)
- Internal (logs, metrics, plans)
- Sensitive (execution inputs/outputs, secrets, receipts with digests)
- Regulated (PII/PHI — must be denied or redacted)

# Lifecycle
1. **Ingest**: Manifest/inputs received → validated → classified.
2. **Process**: Execution emits step logs/digests.
3. **Store**: Metadata in Postgres; receipts/logs in S3 (Object Lock).
4. **Retain**: Receipts 7y; logs 90d (configurable).
5. **Export**: Disclosure pack via signed archive.
6. **Delete**: TTL jobs; cryptographic erase where supported.

# Residency
- `workflow.region` must equal `request.region` (OPA residency pack).
- Buckets named `mc-${region}-receipts` and tagged for residency auditing.
````

---

## 4) Audit & Event Schemas

`docs/audit/MC_EVENTS.md`

```json
{
  "$id": "https://companyos/internal/mc/events.v1.json",
  "type": "object",
  "required": ["id", "ts", "type", "actor", "subject", "data"],
  "properties": {
    "id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "type": {
      "type": "string",
      "enum": [
        "mc.workflow.published",
        "mc.execution.started",
        "mc.execution.receipt.signed",
        "mc.policy.decision",
        "mc.release.rollback"
      ]
    },
    "actor": {
      "type": "object",
      "properties": { "sub": { "type": "string" }, "ip": { "type": "string" } }
    },
    "subject": {
      "type": "object",
      "properties": {
        "workflowId": { "type": "string" },
        "executionId": { "type": "string" }
      }
    },
    "data": { "type": "object" }
  }
}
```

`apps/mc-api/events/topics.yaml`

```yaml
version: 1
bus: mc-events
partitions: 12
retentionDays: 30
schemas:
  - id: mc.events.v1
    file: ../../docs/audit/MC_EVENTS.md
```

---

## 5) Telemetry Conventions

`docs/observability/TELEMETRY.md`

```md
# Metrics

- `mc_publish_to_start_ms` (histogram)
- `mc_policy_denies_total` (counter)
- `mc_receipts_signed_total` (counter)
- `http_requests_total` (counter)

# Logs

- JSON lines; keys: `trace_id`, `span_id`, `actor.sub`, `workflow.id`, `exec.id`.

# Tracing

- W3C traceparent; propagate through runners. Sample 10% by default; 100% on error.
```

---

## 6) Database Schema & Migrations (Postgres)

`apps/mc-api/db/schema.sql`

```sql
create table workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  manifest jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id),
  status text not null check (status in ('pending','running','succeeded','failed','rolled_back')),
  region text not null,
  started_at timestamptz,
  finished_at timestamptz,
  cost_usd numeric(12,4) default 0
);

create table receipts (
  execution_id uuid primary key references executions(id),
  receipt_json jsonb not null,
  digest text not null,
  signature text not null,
  stored_uri text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index on executions (status);
create index on receipts (verified);
```

`apps/mc-api/db/migrations/0001_init.sql`

```sql
-- migrate:up
-- (contents identical to schema.sql)
-- migrate:down
-- drop tables in reverse order
```

---

## 7) Local Dev Stack

`dev/docker-compose.yml`

```yaml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_USER: mc
      POSTGRES_DB: mc
    ports: ['5432:5432']
  minio:
    image: minio/minio:RELEASE.2025-01-16T20-47-21Z
    command: server /data
    environment:
      MINIO_ROOT_USER: mc
      MINIO_ROOT_PASSWORD: password
    ports: ['9000:9000', '9001:9001']
  opa:
    image: openpolicyagent/opa:latest
    command: ['run', '--server', '/policies']
    volumes:
      - ../policy/rego:/policies:ro
    ports: ['8181:8181']
```

`dev/.env.example`

```env
DATABASE_URL=postgres://mc:password@localhost:5432/mc
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=mc-us-receipts
OPA_URL=http://localhost:8181/v1/data
```

---

## 8) Test Strategy & Matrices

`docs/testing/MC_TEST_STRATEGY.md`

```md
# Coverage Targets

- Critical paths ≥ 85%; overall ≥ 75%.

# Test Pyramid

- Unit (fast, isolated)
- Component (API + DB + OPA via docker‑compose)
- E2E (CLI→API→Runner, single happy path)

# Matrices

| Area     | Positive       | Negative                    | Chaos                     |
| -------- | -------------- | --------------------------- | ------------------------- |
| Manifest | valid schema   | version conflict, bad types | schema hot‑swap denied    |
| Policy   | allow          | deny (PII/residency/budget) | PDP timeout = fail closed |
| Receipts | sign & verify  | tampered signature          | object lock write fail    |
| Canary   | normal rollout | breach triggers rollback    | canary controller crash   |
```

`apps/mc-api/scripts/coverage-gate.js`

```js
#!/usr/bin/env node
const fs = require('fs');
const min = parseInt(process.argv[2] || '85', 10);
const data = JSON.parse(
  fs.readFileSync('coverage/coverage-summary.json', 'utf8'),
);
const pct = data.total.statements.pct;
if (pct < min) {
  console.error(`Coverage ${pct}% < ${min}%`);
  process.exit(1);
}
console.log(`Coverage OK: ${pct}%`);
```

---

## 9) Error‑Budget Policy

`docs/ops/ERROR_BUDGET_POLICY.md`

```md
- Window: 28 days; Availability SLO 99.9% → budget 43m.
- Burn Alerts: warn @ 25% daily burn; page @ 50% daily; auto‑rollback if > 10%/h for 15m.
- Freeze Rules: feature freeze if 2 consecutive days > 50% daily burn.
- Exit Criteria: budget restored to > 60% and burn < 5%/day for 3 days.
```

---

## 10) Rollout & Incident Playbooks

`docs/ops/ROLLOUT_PLAYBOOK.md`

```md
1. Preflight: schema & policy gates green; synthetic probes green; canary weights set (10%).
2. Deploy: helm upgrade; watch dashboard; alert hooks armed.
3. Validate: p95 < 900ms, errorRate < 1%, denies < 5%.
4. Promote: increase to 50% after 30m stable; then 100% after 60m.
5. Evidence: export canary report to /docs/release/evidence.
```

`docs/ops/INCIDENT_PLAYBOOK.md`

```md
Sev1 Criteria: API 5xx > 5% 5m or publish→start p95 > 5s 10m.

- Contain: engage on‑call; set weight=0; trigger rollback.
- Inform: status page update; stakeholder ping; timestamped notes.
- Eradicate: identify root cause; add regression tests.
- Recover: resume rollout; postmortem within 48h; add guardrails.
```

---

## 11) Runner Idempotency & Retries (reference impl)

`apps/mc-runner/internal/idempotency.go`

```go
package internal

import (
  "context"
  "crypto/sha256"
  "encoding/hex"
)

type Store interface { Get(string) ([]byte, bool); Put(string, []byte) error }

func Key(manifestDigest, taskID string, input []byte) string {
  h := sha256.Sum256(append(append([]byte(manifestDigest), []byte(taskID)...), input...))
  return hex.EncodeToString(h[:])
}

func ExecuteOnce(ctx context.Context, s Store, k string, f func(context.Context) ([]byte, error)) ([]byte, error) {
  if v, ok := s.Get(k); ok { return v, nil }
  out, err := f(ctx); if err != nil { return nil, err }
  _ = s.Put(k, out)
  return out, nil
}
```

---

## 12) Redaction Helper (library stub)

`libs/redact/redact.ts`

```ts
export function redact(obj: Record<string, any>): Record<string, any> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (
      lk.includes('password') ||
      lk.startsWith('ssn') ||
      lk.includes('secret')
    )
      out[k] = '***';
    else out[k] = v;
  }
  return out;
}
```

---

## 13) Synthetic Canary Breach Simulator

`tools/canary/breach-sim.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
curl -fsS -X POST "$CM_URL/breach" \
  -H 'content-type: application/json' \
  -d '{"service":"mc","metric":"p95LatencyMs","value":1120,"threshold":900}'
```

---

## 14) Disclosure Pack Layout

`docs/provenance/DISCLOSURE_LAYOUT.md`

```md
pack.tgz
├─ receipt.json
├─ receipt.sig
├─ sbom.json
├─ policy/
│ ├─ decisions.json
│ └─ bundles.sha256
└─ logs/
└─ exec\_\*.ndjson
```

---

## 15) Access Policies (OPA ABAC baseline)

`policy/rego/access.rego`

```rego
package mc.access

default allow = false

allow {
  input.actor.role == "admin"
}

allow {
  input.actor.role == "operator"
  input.action == "execute"
}

allow {
  input.actor.role == "composer"
  input.action == "publish"
}
```

---

## 16) Make Targets (Dev ergonomics)

`Makefile`

```make
.PHONY: dev up down db schema lint test e2e disclose

up:
	docker compose -f dev/docker-compose.yml up -d

down:
	docker compose -f dev/docker-compose.yml down -v

db:
	psql $$DATABASE_URL -f apps/mc-api/db/schema.sql

test:
	npm test --workspaces

e2e:
	npx ts-node tests/e2e/happy-path.ts

disclose:
	curl -fsS "$${API}/api/executions/$$EXEC/disclosure.tgz" -o pack.tgz
```

---

## 17) E2E Happy Path (headless)

`tests/e2e/happy-path.ts`

```ts
import axios from 'axios';
(async () => {
  const wf = await axios.post(`${process.env.API}/api/workflows`, {
    name: 'hp',
    version: '0.1.0',
    tasks: [{ id: 't1', uses: 'pkg:demo/echo@1.0.0' }],
  });
  await axios.post(`${process.env.API}/api/workflows/${wf.data.id}/publish`);
  const exec = await axios.post(`${process.env.API}/api/executions`, {
    workflowId: wf.data.id,
    rollout: 'canary',
  });
  const rec = await axios.get(
    `${process.env.API}/api/executions/${exec.data.id}/receipt`,
  );
  console.log('status', rec.status);
})();
```

---

## 18) Compliance Checklist (merge gate)

`docs/compliance/CHECKLIST.md`

```md
- [ ] SBOM attached to artifacts
- [ ] Cosign signatures verified
- [ ] Residency checks enforced
- [ ] PII guards active; redaction library applied
- [ ] Secrets scanned (gitleaks)
- [ ] Vuln budget within threshold
- [ ] Runbook & SLOs updated
- [ ] Audit events emitted & validated
```

---

> Logistics wins; evidence speaks. This kit + prior sprint docs are sufficient to stand up MC on the paved road, with verifiable provenance and rollback discipline.

```

```
