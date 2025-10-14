```markdown
---
slug: sprint-2026-02-16-kilo
version: v2026.02.16-k1
cycle: Sprint 33 (2 weeks)
start_date: 2026-02-16
end_date: 2026-02-27
owner: Release Captain (you)
parent_slug: sprint-2026-02-02-juliet
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Observability Engineer
  - FinOps Lead
  - Repo Maintainer / Arborist
objectives:
  - "Event-first reliability: outbox pattern + CDC for ingest; exactly-once semantics at-least-once delivery."
  - "Tenant data protection: field-level encryption (FLE) with per-tenant keys + key-rotation runbook."
  - "Multi-cloud posture (control-plane): portable backups, artifact mirroring, and image promotion parity."
  - "Self-serve platform: golden `svc-template` generator, paved-road Helm chart, and one-command preview."
  - "Traffic mgmt v2: per-tenant weighted routing and surge shedding without SLO breach."
  - "Observability depth v2: RED+Saturation SLOs per tenant, query sampling guards, and usage analytics."
---

# Sprint 33 Plan — Event-First Reliability, Tenant FLE, and Self‑Serve Platform

Builds on Sprint 32 (runtime hardening, throughput, tenant quotas). We make ingest resilient with **outbox+CDC**, raise data protection via **field‑level encryption with per‑tenant keys**, set up **multi‑cloud artifacts/backup parity**, and deliver a **golden path service template**.

---

## 0) Definition of Ready (DoR)
- [ ] Outbox target tables and CDC transport chosen; idempotency keys defined.
- [ ] FLE scope and crypto envelope agreed (AES‑GCM per field; KEK per tenant with KMS).
- [ ] Artifact registry mirroring targets (primary↔secondary) and retention policy agreed.
- [ ] `svc-template` requirements collected (health, probes, OTEL, flags, RBAC, Makefile, CI).</n>
- [ ] Tenant routing weights and shedding thresholds documented.

---

## 1) Swimlanes

### A. Event‑First Reliability (Platform/Backend)
1. **Outbox pattern** for ingest writes; transactional outbox table + dequeue worker.
2. **CDC** streaming to queue/bus; idempotent consumers with fingerprint keys.
3. **Dead-letter** policy + replay tooling with trace correlation.

### B. Tenant Field‑Level Encryption (Security/Data)
1. **Envelope encryption** lib (SDK) for sensitive fields; KEK per tenant via KMS.
2. **Rotation** workflow (dual‑write decrypted→re‑encrypt) behind flag; audit evidence.
3. **Searchability**: optional deterministic encryption for exact‑match fields.

### C. Multi‑Cloud Posture (Platform/CI)
1. **Artifact mirroring** (images, SBOM, provenance) to secondary registry.
2. **Portable backups**: cross‑provider object store with object‑lock + checksums.
3. **Promotion parity**: identical tag/attestation across regions.

### D. Self‑Serve Platform (DevX)
1. **`svc-template`** generator (CLI) with Helm, CI, OTEL, probes, securityContext.
2. **One‑command preview**: `make preview PR=<n>` (re‑use prior scaffolds).
3. **Docs**: paved road guide + examples.

### E. Traffic Mgmt v2 (Gateway/SRE)
1. **Per‑tenant weights** for gradual feature ramp; surge shedding via 429 with hints.
2. **Adaptive timeouts/retries** tuned by tier.

### F. Observability Depth v2 (Obs)
1. **Per‑tenant SLOs** (RED+Saturation) & burn alerts.
2. **Query sampling guard** to cap high‑cardinality spans.
3. **Usage analytics**: per‑tenant request mix & cache hit ratios.

---

## 2) Measurable Goals
- Outbox+CDC handles **≥ 95%** of ingest with zero lost events; duplicate rate ≤ 0.1%.
- FLE live for 2 sensitive fields (e.g., `email`, `phone`) on **gold** tenants; rotation runbook executed in stage.
- Secondary registry shows mirrored images **< 5m** after push; SBOM/provenance intact.
- `svc-template` can create a new service to preview in **< 10m** with green checks.
- Per‑tenant weighted ramp used on one feature; **no SLO breach** during surge.
- Per‑tenant SLO dashboards published; burn alerts validated.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Outbox bloat / lag | M | M | Periodic compaction, indexes, batch dequeue, metrics | Platform |
| FLE key mishandling | L | H | KMS only, least‑privilege, dual control rotation, audit | Security |
| Registry mirror drift | M | M | Signed attestations, periodic diff, alert on mismatch | CI |
| Sampling too aggressive | M | M | Multi‑window thresholds and allow list for key spans | Obs |

---

## 4) Backlog (Sprint‑Scoped)

### EPIC‑OUT: Outbox + CDC
- [ ] OUT-5001 — Outbox table + TX hook and enqueue worker
- [ ] OUT-5002 — CDC stream to bus + idempotent consumer fingerprinting
- [ ] OUT-5003 — DLQ + replay tool with trace correlation

### EPIC‑FLE: Field‑Level Encryption
- [ ] FLE-5101 — Envelope crypto SDK (AES‑GCM; KEK per tenant)
- [ ] FLE-5102 — Deterministic mode for exact‑match fields
- [ ] FLE-5103 — Rotation workflow + audit evidence

### EPIC‑MC: Multi‑Cloud Posture
- [ ] MC-5201 — Registry mirroring job + signature/attestation copy
- [ ] MC-5202 — Portable backup to secondary object store with object‑lock
- [ ] MC-5203 — Promotion parity checks in CI

### EPIC‑DEVX: Self‑Serve Template
- [ ] DEVX-5301 — `svc-template` CLI + templates
- [ ] DEVX-5302 — One‑command preview integration
- [ ] DEVX-5303 — Paved road docs

### EPIC‑TM: Traffic Mgmt v2
- [ ] TM-5401 — Per‑tenant weight config + ramp tool
- [ ] TM-5402 — Surge shedding (hinted 429) + adaptive timeouts

### EPIC‑OBS2: Tenant SLOs & Sampling
- [ ] OBS2-5501 — Per‑tenant SLO dashboards + alerts
- [ ] OBS2-5502 — Query sampling guardrail
- [ ] OBS2-5503 — Usage analytics collectors

---

## 5) Scaffolds & Snippets

### 5.1 Outbox Table & Worker
**Path:** `ops/db/outbox.sql`
```sql
CREATE TABLE IF NOT EXISTS outbox (
  id BIGSERIAL PRIMARY KEY,
  aggregate TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dequeued_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS outbox_fingerprint_idx ON outbox(fingerprint);
```
**Path:** `services/ingest/src/outbox-worker.ts`
```ts
const BATCH=200; const SLEEP=200;
while(true){
  const rows = await db.query('SELECT * FROM outbox WHERE dequeued_at IS NULL ORDER BY id ASC LIMIT $1', [BATCH]);
  if(!rows.rowCount){ await sleep(SLEEP); continue; }
  for(const r of rows.rows){
    const ok = await bus.publish(r.kind, r.payload, { idempotencyKey: r.fingerprint });
    if(ok) await db.query('UPDATE outbox SET dequeued_at=now() WHERE id=$1', [r.id]);
  }
}
```

### 5.2 CDC Stream (Debezium/Logical)
**Path:** `ops/cdc/connector.json`
```json
{ "name":"pg-outbox", "config": { "connector.class":"io.debezium.connector.postgresql.PostgresConnector", "table.include.list":"public.outbox" } }
```

### 5.3 Envelope Crypto SDK
**Path:** `libs/crypto/envelope.ts`
```ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
export function encryptField(tenantKek: Buffer, plaintext: Buffer){
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tenantKek, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, ct]).toString('base64');
}
export function decryptField(tenantKek: Buffer, blob: string){
  const b = Buffer.from(blob,'base64');
  const iv = b.subarray(1,13); const tag = b.subarray(13,29); const ct = b.subarray(29);
  const d = createDecipheriv('aes-256-gcm', tenantKek, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
```

### 5.4 Deterministic Mode (exact‑match)
**Path:** `libs/crypto/deterministic.ts`
```ts
import { createHmac } from 'crypto';
export function detToken(tenantKek: Buffer, value: string){
  return createHmac('sha256', tenantKek).update(value).digest('base64url');
}
```

### 5.5 Rotation Workflow (sketch)
**Path:** `.github/workflows/fle-rotate.yml`
```yaml
name: fle-rotate
on: [workflow_dispatch]
jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/fle-rotate.js  # dual-write + re-encrypt
```

### 5.6 Registry Mirroring (Action)
**Path:** `.github/workflows/registry-mirror.yml`
```yaml
name: registry-mirror
on:
  push:
    branches: [main]
jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Mirror image
        run: |
          crane copy ghcr.io/org/app:${{ github.sha }} registry-2.example.com/org/app:${{ github.sha }}
          cosign copy ghcr.io/org/app:${{ github.sha }} registry-2.example.com/org/app:${{ github.sha }}
```

### 5.7 Portable Backups
**Path:** `tools/backup.sh`
```bash
pg_dump --format=custom $DATABASE_URL | \
  aws s3 cp - s3://backups-primary/db/$(date +%F).dump --sse AES256
# then cross-region/object-lock replication policy handles parity
```

### 5.8 svc-template CLI (plop)
**Path:** `tools/svc-template/plopfile.js`
```js
module.exports = function(plop){
  plop.setGenerator('service', {
    description: 'Scaffold paved-road service',
    prompts: [{ type:'input', name:'name', message:'Service name' }],
    actions: [ { type:'addMany', destination:'services/{{name}}', base:'tools/svc-template/base' } ]
  });
}
```

### 5.9 Per‑tenant Weights & Shedding (Envoy)
**Path:** `charts/gateway/templates/tenant-routing.yaml`
```yaml
# pseudoconfig: route to vNext by tenant with weight; return 429 with Retry-After on shed
```

### 5.10 Per‑tenant SLOs & Sampling Guard
**Path:** `charts/monitoring/templates/tenant-slo.yaml`
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: tenant-slo }
spec:
  groups:
  - name: tenant.rules
    rules:
    - record: tenant:error_rate_5m
      expr: sum by (tenant) (rate(http_requests_total{status=~"5.."}[5m])) / sum by (tenant) (rate(http_requests_total[5m]))
```

---

## 6) Observability & Alerts
- **Dashboards**: outbox lag, CDC throughput, DLQ rate, FLE coverage & rotation events, registry mirror parity, svc-template adoption, tenant ramp & 429s, per‑tenant SLOs.
- **Alerts**: outbox lag > threshold, CDC connector down, FLE decrypt failures, mirror drift, tenant 429s > 1% sustained, sampling guard tripped.

---

## 7) Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | Outbox table live; SDK wired | Enable outbox worker + CDC on subset | No event loss; duplicates ≤ 0.1% | Disable worker; pause connector |
| stage | Dev soak 24h | FLE on gold tenants; registry mirror on | Reads/writes ok; attest parity | Disable FLE flag; rekey back |
| prod | Stage soak 48h | Tenant ramp + surge shedding; publish svc-template | SLO green; 429s < 1%; template works | Revert weights; disable shedding |

---

## 8) Acceptance Evidence
- Outbox/CDC metrics graphs & replay logs.
- FLE encryption/rotation proof; audit objects with key IDs.
- Registry mirror logs & attestation checksums; SBOM parity.
- New service created via template and deployed to preview with green checks.
- Tenant ramp dashboard showing controlled rollout and stable SLOs.

---

## 9) Calendar & Ownership
- **Week 1**: Outbox + worker, CDC connector, FLE SDK, registry mirror, svc-template base.
- **Week 2**: FLE rotation in stage, tenant ramp tool, usage analytics, acceptance pack, release cut.

Release cut: **2026-02-27 (Fri)** with staged rollout + rollback plan.

---

## 10) Issue Seeds
- OUT-5001/5002/5003, FLE-5101/5102/5103, MC-5201/5202/5203, DEVX-5301/5302/5303, TM-5401/5402, OBS2-5501/5502/5503

---

_End of Sprint 33 plan._
```

