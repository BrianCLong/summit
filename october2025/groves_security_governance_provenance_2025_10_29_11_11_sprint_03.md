# Sprint Packet — Security, Governance, Provenance & Ops (Groves Workstream)

**Cadence:** 2025‑10‑29 → 2025‑11‑11 (2 weeks)  
**Role / Workstream:** Leslie Groves — Engineer’s Seat (Compartmentation, accreditation, provenance, SRE)  
**Alignment:** Q4 GA hardening; Prov‑Ledger v1.2; Cost Guard v2; Compliance audit‑pack; Continuous Authorization  
**Status Target:** Ship **clean/green** features with acceptance evidence; close Sprint‑02 carry‑over; expand controls to auditor‑ready posture

---

## 0) Roll‑forward & Context

**From Sprint‑02:** Detached signatures + Merkle roots verified; contradiction overlays delivered; vector governance online; enclave transforms (alpha); Cost Guard GA; control mapping in UI.  
**Carry‑over debt:**

- Enclave attestation verification in `prov-verify` not yet pluggable for non‑cosign attestations.
- Vector redaction backpressure tuning for very large shards (≥5M vectors).
- Auditor export needs examples and narrative mapping per control.

**This sprint:** finalize verifier extensibility, wire appeals/ombuds into UI flows, bring continuous authorization (real‑time consent/role change), and ship full **Audit Pack v1**.

---

## 1) Objectives (Definition of Victory)

1. **Prov‑Ledger v1.2 (Extensible Verify):** pluggable attestation validators (cosign, X.509, TUF root), offline verify, and transparency log option.
2. **Appeals & Oversight Flow:** end‑to‑end appeal on policy denials with ombuds queue, SLA clocks, and decision artifacts.
3. **Continuous Authorization (ConAuth):** sessionless PEP checks on each sensitive action; hot role/consent changes take effect within ≤60s.
4. **Vector Governance v2:** automated purge/recall by retention policy; operator preview/diff and dry‑run; performance hardened for 10M+ vectors.
5. **Cost Guard v2:** optimizer hints (rewrite/paginate), per‑namespace rate shaping, and customer‑visible guidance in UI.
6. **Audit Pack v1:** one‑click export containing policies, manifests, sigs, SLO proofs, chaos evidence, and control traceability; downloadable JSON/CSV/PDF.
7. **Data Residency & Compartmentation:** region/tenant data‑plane pins enforced and verified; export blocks on residency violations.

---

## 2) Deliverables

- **D1. Verifier Plugins**
  - `tools/prov-verify/plugins/` with adapters: `cosign`, `x509-pki`, `tuf-root`.
  - Transparency log integration (Rekor‑style) optional; offline cache for air‑gapped verify.
- **D2. Appeals/Ombuds UX**
  - Policy‑denied screen → “Appeal” modal → ticket in Ombuds; SLA timers; decision trail attached to audit record.
- **D3. ConAuth**
  - PEP hooks at gateway; PDP cache with event‑driven invalidation (role/consent/policy).
  - Websocket or pub/sub channel for policy updates to invalidate sessions.
- **D4. Vector Governance v2**
  - `vector-redactor` job with dry‑run, diff, and progress; shard throttling; resumable checkpoints.
- **D5. Cost Guard v2**
  - Optimizer that inspects plan and suggests: predicate pushdown, LIMIT/PAGINATE, narrower projections; UI bubble shows guidance.
- **D6. Audit Pack v1**
  - `audit-pack-<org>-<date>.tgz` with policy bundles, simulation reports, manifest/sig pairs, SLO evidence, chaos runs, budget dashboards, and control map.
- **D7. Residency Enforcement**
  - Region tags for evidence and vector shards; export & query guards; residency report in Admin Studio.

---

## 3) Epics → Stories → Tasks

### EPIC A — Prov‑Ledger v1.2

- **A1. Attestation Plugins**
  - T1. Plugin interface (verify(input): Result).
  - T2. Cosign + X.509 + TUF implementations; unit tests + fixtures.
- **A2. Transparency Log**
  - T1. Append manifest.root + sig digest; offline mirror support.
- **A3. CLI Hardening**
  - T1. Offline mode; cache warmers; structured logs; machine‑readable report.

### EPIC B — Appeals & Ombuds

- **B1. UI/UX**
  - T1. Denial → Appeal flow; capture justification; suggested data minimization.
- **B2. Backend**
  - T1. Ombuds tickets API (SLA states: new, triage, pending‑info, decided);
  - T2. Decision artifact schema; attach to original audit event.

### EPIC C — Continuous Authorization

- **C1. PDP/PEP**
  - T1. PDP decision cache with TTL + event invalidation.
  - T2. PEP hooks on create/read/export of sensitive objects.
- **C2. Eventing**
  - T1. Policy/role/consent topics; broadcaster in Admin Studio; client listeners.

### EPIC D — Vector Governance v2

- **D1. Redaction/Recall**
  - T1. Dry‑run diff: list would‑delete embeddings + affected queries.
  - T2. Apply mode with checkpointing; P95 throughput target.
- **D2. Perf & Backpressure**
  - T1. Adaptive concurrency; shard‑aware throttling; alerts on backlog.

### EPIC E — Cost Guard v2

- **E1. Optimizer Hints**
  - T1. Plan inspector; common antipattern rewrites.
  - T2. UI guidance bubble + docs link; copy‑pasteable fixed query.
- **E2. Rate Shaping**
  - T1. Namespace rate limits; error codes + headers.

### EPIC F — Residency & Compartmentation

- **F1. Region Tags & Guards**
  - T1. Region pin at ingest; schema migration; deny exports crossing pins.
- **F2. Residency Report**
  - T1. Admin report: data by region, exceptions, attempted violations.

### EPIC G — Audit Pack v1

- **G1. Packager**
  - T1. Gather artifacts; sign pack; create index.json.
- **G2. Narrative Mapping**
  - T1. Map user actions to SOC2/ISO controls; include evidence paths.

---

## 4) Acceptance Criteria

- **Verifier:** plugins pass golden suites; offline verify produces identical results; transparency entries reproducible.
- **Appeals:** ≥95% of denials offer appeal; SLA compliance shown; decision artifacts linked in audit.
- **ConAuth:** role/consent change reflected in ≤60s; stale sessions blocked on next sensitive action.
- **Vector Gov v2:** redaction dry‑run shows exact diffs; apply completes P95 ≤ 15m for 10M vectors; full audit trail.
- **Cost Guard v2:** optimizer hints shown for ≥90% costly queries; customer can adopt copy‑paste rewrite; rate shaping visible.
- **Residency:** no cross‑region reads/exports without policy; residency report reconciles 100%.
- **Audit Pack v1:** downloadable artifact verified good; includes control map and pointers to evidence.

---

## 5) Interfaces & Schemas (Scaffolding)

### 5.1 Verifier Plugin Interface (TS)

```ts
export interface AttestationPlugin {
  name: string;
  verify(input: {
    manifest: Manifest;
    root: string;
    signature: Buffer;
    certs?: Buffer[];
    offlineCacheDir?: string;
  }): Promise<{ ok: boolean; errors?: string[]; warnings?: string[] }>;
}
```

### 5.2 Appeals Models (SQL)

```sql
CREATE TABLE ombuds_ticket (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  state TEXT CHECK (state IN ('new','triage','pending_info','decided')),
  sla_due TIMESTAMPTZ NOT NULL,
  requester UUID NOT NULL,
  denial_event_id UUID NOT NULL REFERENCES audit_events(id)
);

ALTER TABLE audit_events ADD COLUMN appeal_ticket_id UUID NULL REFERENCES ombuds_ticket(id);
```

### 5.3 PEP Hook (Pseudo)

```go
func PEP(ctx Context, action Action, obj Resource) error {
  dec := PDP.Decide(ctx.User, action, obj.Labels)
  if !dec.Allow { return Denied(dec.Reason, AppealLink(dec)) }
  return nil
}
```

### 5.4 Vector Redaction Dry‑Run (CLI)

```bash
vector-redactor dry-run \
  --case CASE-123 \
  --retention 90d \
  --purpose research \
  --out reports/CASE-123-diff.json
```

### 5.5 Optimizer Hint Payload

```json
{
  "queryId": "q:paths_k_shortest",
  "estimatedCost": 4800,
  "hints": [
    { "type": "limit", "suggested": "LIMIT 500" },
    { "type": "project", "suggested": "SELECT id, ts, label" },
    { "type": "paginate", "suggested": "cursor: after=<id>" }
  ]
}
```

### 5.6 Residency Labels

```yaml
evidence:
  id: ev‑001
  region: us‑west‑2
  tenant: acme
  labels:
    sensitivity: confidential
```

### 5.7 Audit Pack Index

```json
{
  "version": "1.0",
  "generatedAt": "2025-11-10T23:20:00Z",
  "artifacts": [
    { "name": "policy-bundle", "path": "policy/opa-2025-11-10.tgz" },
    { "name": "prov-packs", "path": "prov/" },
    { "name": "slo-evidence", "path": "ops/evidence/slo/" },
    { "name": "chaos-runs", "path": "ops/evidence/chaos/" },
    { "name": "budget-dashboards", "path": "ops/cost-explorer/" },
    { "name": "control-map", "path": "compliance/control-map.csv" }
  ]
}
```

---

## 6) Test Plan

- **Verifier Plugins:** fixtures for each plugin; offline cache tests; cross‑impl consistency.
- **Appeals Flow:** synthetic denials, timed SLA; audit linking verified.
- **ConAuth:** role toggles + consent revocations; propagation timing; stale session interception.
- **Vector Gov v2:** 10M‑vector synthetic; measure throughput; ensure resumability.
- **Cost Guard v2:** 500 top expensive queries; hint adoption; rate headers asserted.
- **Residency:** forced violation attempts; export guard blocks; report reconciliation.
- **Audit Pack:** reproduce pack; verify with `prov-verify`; spot‑check control lines to evidence.

---

## 7) Ops & Evidence

- CI publishes plugin conformance matrix; appeals SLA dashboard; ConAuth invalidation rates; vector redaction throughput; residency violations chart; optimizer adoption.

---

## 8) Documentation & ADRs

- ADR‑052: Attestation Plugin Framework for Prov‑Verify.
- ADR‑053: Appeals & Ombudsman Workflow.
- ADR‑054: Continuous Authorization Architecture.
- ADR‑055: Vector Governance v2 Redaction/Recall.
- ADR‑056: Data Residency Enforcement Model.
- Playbooks: PB‑O03 (Appeals Handling), PB‑A03 (ConAuth Hot Changes), PB‑G02 (Residency Exceptions).

---

## 9) RACI & Cadence

- **R:** Groves Workstream.
- **A:** Chief Architect.
- **C:** Legal/Compliance, SRE, Data Steward, UI Lead, Platform.
- **I:** Seat owners; Sales Eng (for Audit Pack enablement).

**Ceremonies:** Daily stand‑up; Mid‑sprint demo (2025‑11‑05); Sprint review (2025‑11‑11); Retro + next sprint planning.

---

## 10) Dependencies

- PKI/TUF roots provisioned; event bus for ConAuth; UI hooks for denial/appeal; large‑shard staging dataset; Grafana panels v2.

---

## 11) Out‑of‑Scope (parking lot)

- Cross‑org disclosure exchange format.
- Fully automated regulator portal.
- Marketplace compliance scans.

---

## 12) Shipping Checklist

- [ ] CI green: verifier plugins, ConAuth hooks, vector redactor v2, optimizer hints, residency guards.
- [ ] Security scan zero criticals; SBOM updated.
- [ ] Docs/ADRs merged; Playbooks published.
- [ ] Dashboards live; alerts tuned; SLA boards show green.
- [ ] Demo script & dataset updated.
- [ ] Rollback instructions tested.

---

## 13) Appendix — Fixtures & Samples

- `fixtures/verify/plugins/` signed bundles for cosign/x509/tuf.
- `fixtures/appeals/` denial → appeal sequences with outcomes.
- `fixtures/conauth/` role/consent toggles and timing logs.
- `fixtures/vector/large/` 10M‑vector synthetic shards + manifests.
- `fixtures/residency/` cross‑region negative cases.
- `fixtures/audit-pack/` example pack with control map.

---

**We don’t negotiate with drift.** Lock policy, prove provenance, enforce in real time, and ship evidence an auditor will sign.
