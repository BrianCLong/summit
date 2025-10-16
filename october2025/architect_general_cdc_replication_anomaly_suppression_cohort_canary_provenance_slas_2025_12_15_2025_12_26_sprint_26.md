# Architect-General — CDC Replication, Anomaly Suppression UI, Cohort Canary, Provenance SLAs

**Workstream:** Data Spine & Governance Reliability — Switchboard Platform  
**Sprint Window:** 2025-12-15 → 2025-12-26 (10 biz days)  
**Ordinal:** Sprint 26 (Q4’25 cadence)  
**Prime Objective:** Make governance & data pipelines **real‑time and accountable**: ship CDC replication with residency filters, anomaly suppression & feedback loop, per‑cohort canary scoring, structured export bundles with transparency attestations, and a Provenance SLA dashboard with error‑budget gates.

---

## 0) Executive Summary

- **Track A (Now‑value):**
  - **CDC Replication v1** (Debezium → Kafka/NATS) with residency filter; cross‑region **read‑only** mirrors.
  - **Anomaly Suppression UI** with justification + TTL + audit trail; feedback improves rules.
  - **Cohort‑Aware Canary** scoring (user journeys × cohorts) wired into deploy gates.
  - **Structured Exports v1** (NDJSON + manifest + attestations) with verify tool.
  - **Provenance SLA Dashboard** (release→bundle→rekor→verify timings, MTTR on gaps).
- **Track B (Moat):**
  - **Residency‑aware CDC topology** templates; **OPA guard** for export bundle access; **error budget enforcement** on provenance monitor service.

**Definition of Done:**

- CDC mirrors in place; residency filter prevents EU→US writes; cross‑region reads only via export path.
- Anomaly suppressions captured with TTL; rule learning job proposes deltas; alerts include suppression context.
- Cohort canary score gates deploy; rollback on score <90 for any high‑priority cohort.
- Exports carry signed manifest + attestation; `verify` passes locally and in CI.
- SLA dashboard live; alerts on SLA breach; provenance monitor enforces burn‑rate gate.

---

## 1) Objectives & Key Results

**OBJ‑1: CDC Replication with Residency Filters**

- **KR1.1** Debezium connectors for `audit_events_*` tables with topic naming `audit.<region>.<table>`.
- **KR1.2** Residency filter service drops **cross‑region writes**; produces sanitized mirror topics.
- **KR1.3** Consumer builds **read‑only mirrors** (EU↔US) with lag ≤ 5s (p95) in staging.

**OBJ‑2: Anomaly Suppression & Feedback**

- **KR2.1** UI to suppress an alert with reason + TTL; stored in `security_suppressions`.
- **KR2.2** Suppression applied across anomaly engine & provmon; audit trail written.
- **KR2.3** Weekly job suggests rule updates based on accepted suppressions.

**OBJ‑3: Cohort‑Aware Canary Scoring**

- **KR3.1** Define high‑value cohorts (Enterprise, Regulated‑EU, Ops‑Admin).
- **KR3.2** Weighted scoring per cohort; gate fails if **any** priority cohort <90.
- **KR3.3** Synthetic journeys parameterized by cohort contexts (region, roles, data shapes).

**OBJ‑4: Structured Exports + Attestations**

- **KR4.1** Export bundle (tar.gz) contains NDJSON, manifest (sha256, counts, region), and `predicate.json`.
- **KR4.2** CI signs manifest (cosign) + emits **attestation** (SLSA predicate type).
- **KR4.3** `export-verify` tool validates hashes, signature, and provenance.

**OBJ‑5: Provenance SLA Dashboard & Gates**

- **KR5.1** SLOs: Build→Sign ≤ 5m p95; Sign→Rekor ≤ 2m p95; Deploy→Verify ≤ 2m p95.
- **KR5.2** Error‑budget burn alerts; gate blocks releases when burn > 2x over 1h.
- **KR5.3** Dashboard panels + annotations on breaches with links to evidence packs.

---

## 2) Work Breakdown & Owners

| #   | Epic    | Issue                               | Owner   | Acceptance                                | Evidence                   |
| --- | ------- | ----------------------------------- | ------- | ----------------------------------------- | -------------------------- |
| A   | CDC     | Debezium connectors + topics        | DataEng | Events flow, lag≤5s                       | Kafka lag charts           |
| B   | CDC     | Residency filter + mirror consumers | SecEng  | EU data never lands in US write path      | Filter logs, audit samples |
| C   | Anomaly | Suppression UI + API + TTL          | FE      | Suppression honored across engines        | Audit trail entries        |
| D   | Canary  | Cohort journeys + gate              | SRE     | Gate fails on <90 for any priority cohort | CI logs, rollback proof    |
| E   | Export  | Bundle builder + attest + verify    | DevOps  | `export-verify` passes                    | Attestation logs           |
| F   | SLA     | Dashboard + burn‑rate gate          | ProdOps | Alerts fire; gate enforces                | Grafana JSON, gate logs    |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 Debezium Connectors (Postgres → Kafka)

**`infra/debezium/connectors/audit_us.json`**

```json
{
  "name": "audit-us",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "audit-us.db",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${DEBEZIUM_PW}",
    "database.dbname": "audit",
    "topic.prefix": "audit.US",
    "table.include.list": "public.audit_events_us",
    "slot.name": "audit_us_slot",
    "tombstones.on.delete": "false",
    "decimal.handling.mode": "double",
    "publication.autocreate.mode": "filtered"
  }
}
```

**`infra/debezium/connectors/audit_eu.json`** mirrors EU.

### 3.2 Residency Filter Service

**Topic Contracts**

```
input:  audit.<REGION>.<TABLE>.raw
output: audit.<REGION>.<TABLE>.mirror
```

**Pseudo‑code (`services/residency-filter/main.ts`)**

```ts
for await (const msg of input) {
  const ev = JSON.parse(msg.value.toString());
  if (ev.region !== THIS_REGION) {
    /* drop or mark */
  }
  const sanitized = dropCrossRegionFields(ev);
  await produce(outputTopic, sanitized);
}
```

**OPA Guard for Cross‑Region Writes (`policies/residency_guard.rego`)**

```rego
package residency

violation["cross_region_write"] {
  input.action == "write"
  input.request.region != input.resource.region
}
```

### 3.3 Mirror Consumer → Read‑Only Shards

**`services/audit-mirror/consumer.ts`**

```ts
// Consumes audit.<region>.audit_events_*.mirror → writes to read_only schema
```

**DB Schema**

```sql
create schema if not exists read_only;
create table if not exists read_only.audit_events_eu (like public.audit_events including all);
create table if not exists read_only.audit_events_us (like public.audit_events including all);
```

### 3.4 Anomaly Suppression UI & API

**DB Schema (`db/migrations/20251215_suppress.sql`)**

```sql
create table if not exists security_suppressions (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null,
  scope jsonb not null, -- e.g., {"region":"EU","subject.user.id":"123"}
  reason text not null,
  ttl timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index on security_suppressions (rule_id, ttl);
```

**API (`/api/anomaly/suppress`)**

```ts
export async function POST(req: Request) {
  /* authz → insert suppression; return id */
}
export async function GET() {
  /* list active suppressions */
}
```

**UI (excerpt)**

```tsx
// apps/web/src/app/security/suppressions/page.tsx
export default function Suppressions() {
  /* grid + create modal with rule, scope, reason, TTL; revoke */
}
```

**Engine Usage**

```ts
// ops/anomaly/eval.ts
if (matchesSuppression(alert, suppressions)) {
  annotate(alert, { suppressed: true, until: s.ttl });
}
```

### 3.5 Cohort‑Aware Canary

**Cohorts (`ops/cohorts.yaml`)**

```yaml
cohorts:
  enterprise: { weight: 0.4, region: US, role: admin }
  regulated_eu: { weight: 0.4, region: EU, role: analyst }
  ops_admin: { weight: 0.2, region: US, role: operator }
```

**Probe Runner (`ops/journeys/run.js`)**

```js
// executes synthetic flows per cohort (login → home → agents → audit → admin)
```

**Scoring Gate (`ops/gates/cohort-score.js`)**

```js
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('probe.results.json', 'utf8'));
let fail = [];
for (const c of Object.keys(cfg)) {
  if (cfg[c].score < 90) fail.push(c);
}
if (fail.length) {
  console.error('cohort gate fail:', fail.join(','));
  process.exit(1);
}
```

### 3.6 Structured Export Bundles + Attestations

**Manifest (`export/manifest.schema.json`)**

```json
{
  "type": "object",
  "properties": {
    "created": "string",
    "region": "string",
    "count": "number",
    "sha256": "string",
    "sourceDigest": "string"
  },
  "required": ["created", "region", "count", "sha256"]
}
```

**Builder (`tools/export-bundle.ts`)**

```ts
// writes data.ndjson, manifest.json; computes sha256; tars to export-<ts>.tar.gz
```

**CI (`.github/workflows/export.yml`)**

```yaml
- name: Build export bundle
  run: node tools/export-bundle.ts --region $REGION
- name: Sign manifest + attest
  run: |
    cosign sign-blob --yes export/manifest.json > export/manifest.sig
    gh attestation sign --subject file:export/manifest.json --predicate-type slsa.provenance
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with: { name: export-bundle, path: export/* }
```

**Verifier (`tools/export-verify.ts`)**

```ts
// verifies tar contents, manifest hash, cosign signature, optional attestation
```

### 3.7 Provenance SLA Dashboard

**SLO Config (`ops/slo/provenance.slo.yaml`)**

```yaml
service: provmon
slos:
  - name: build_to_sign_p95_ms
    objective: 300000
  - name: sign_to_rekor_p95_ms
    objective: 120000
  - name: deploy_to_verify_p95_ms
    objective: 120000
```

**Grafana Panels**

```
- p95 latencies per stage (ms)
- error budget burn (1h, 6h)
- gap incidents with annotations + links to evidence packs
```

**Gate**

```yaml
- name: provenance-burnrate-gate
  run: ops/gates/burnrate.sh --service provmon --window 1h --threshold 2.0
```

---

## 4) Test Strategy

- **Unit:** residency filter; suppression matching; cohort scoring; export manifest verify.
- **Integration:** CDC end‑to‑end lag; mirror read paths; suppressed alert propagation; export verify in CI.
- **Security:** OPA residency guard; export access policies; signature/attestation verify.
- **Performance:** p95 CDC lag≤5s; cohort journeys under load; provmon SLAs met.

---

## 5) Acceptance Checklist (DoR → DoD)

- [ ] CDC connectors running; mirror consumers healthy; lag charts within target.
- [ ] Residency filter blocks cross‑region writes; audit samples prove compliance.
- [ ] Suppression UI live; TTL honored; audit entries present; weekly learning job output captured.
- [ ] Cohort canary gate enforcing; rollback path validated.
- [ ] Export bundles signed + verified; `export-verify` passes.
- [ ] Provenance SLA dashboard live; burn‑rate gate enforced; evidence archived.

---

## 6) Risks & Mitigations

- **Connector drift/outages** → auto‑restart, dead letter queues, lag alerts.
- **Suppression misuse** → require justification + TTL; weekly review; owner approvals for high‑severity rules.
- **Cohort imbalance** → periodic re‑weighting; include low‑traffic cohorts in off‑peak checks.
- **Export sensitivity** → OPA gate + access logs; signed manifests; encrypted storage by default.

---

## 7) Evidence Hooks

- **CDC lag chart URL:** …
- **Residency filter audit sample:** …
- **Suppression list snapshot:** …
- **Cohort score report:** …
- **Export verify log:** …
- **Provenance SLA burn chart:** …

---

## 8) Backlog Seed (Sprint 27)

- Multi‑tenant residency policies; near‑real‑time EU↔US diff audits; adaptive anomaly thresholds; cohort sampling automation; export transparency attestations to a public index; SLA auto‑remediation hooks.
