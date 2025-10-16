# IntelGraph · Maestro Conductor (MC)

# Workstream: SDLC Orchestration & Evidence

# Sprint: 2026‑03‑14 → 2026‑03‑28 (12)

> Mission: Transition from audit‑ready to **trust‑by‑default**. Ship customer‑managed keys (CMK) and key rotation, PETs v2 with query privacy budgets, air‑gapped “Black‑Cell” release bundle, strict residency proofs at export time, and automated deprecation enforcement. Tighten latency on hot paths and publish external auditor pack.

---

## Conductor Summary (One‑Screen)

**Goal.** Deliver CMK encryption + rotation, PETs v2 (per‑tenant privacy budgets + accountant), export‑time residency and license proofs, Black‑Cell offline bundle with provenance ledger resync, deprecation SLA enforcement, and p99 tail reduction on read paths. Produce an **External Auditor Pack** consumable without repo access.

**Assumptions.** Sprint‑11 landed query budgets, PETs v1, access transparency, incident packer, full CI federation, audit rehearsal.

**Non‑Goals.** New product features beyond governance/security; multi‑cloud expansion.

**Constraints.** SLO/cost guardrails; MT SaaS + ST‑DED + Black‑Cell; evidence to promote.

**Risks.** CMK misuse/lockout; PETs utility trade‑offs; offline bundle drift; deprecation friction.

**Definition of Done.**

- CMK envelope encryption live with rotate+reencrypt jobs; KMS adapters (AWS/GCP/Azure) in place.
- PETs v2 with per‑tenant ε budgets + spend tracking; query planner refuses once exhausted.
- Export pipeline attaches signed residency + license proofs; portal exposes proofs per export.
- Black‑Cell bundle builds reproducibly with offline verification + resync plan; validated in clean room.
- Deprecation policy enforced by gates; breaking uses blocked post‑deadline with shim/migration guides.
- p99 read path tail ↓ ≥ 20% vs Sprint‑11 baseline.

---

## Carryover / Dependencies

- KMS credentials per env; HSM availability for prod CMK root.
- Legal sign‑off on license proof format.
- Clean‑room env for Black‑Cell validation.

---

## EPICS → Stories → Tasks (MoSCoW)

### EPIC BQ — Customer‑Managed Keys (Must)

**BQ1. Envelope Encryption**

- Tenant CMK (KMS/HSM) → data keys for fields/objects; rotate hooks.  
  **BQ2. Rotation & Re‑encrypt**
- Background worker supports rotate, rewrap, full reencrypt; throttled, resumable.  
  **BQ3. Key Provenance & Break‑Glass**
- Ledger events for create/rotate/destroy; break‑glass with dual‑control + watermarks.  
  **Acceptance:** Rotate succeeds on fixture; reads post‑rotate succeed; ledger shows signed events.

### EPIC BR — PETs v2: Privacy Budgets (Must)

**BR1. Budget Accountant**

- Track ε spend per tenant/time window; noise calibration per query type.  
  **BR2. Planner Guard**
- Deny/queue when budget exhausted; admin override with warrant + ledger.  
  **BR3. UX & Docs**
- Portal page for remaining budget; export manifests capture ε and accountant hash.  
  **Acceptance:** DP queries spend ε; exhaustion blocks; overrides logged; docs published.

### EPIC BS — Export‑Time Proofs (Must)

**BS1. Residency Proof**

- Include signed region route map for all reads feeding export; proof attached to manifest.  
  **BS2. License/TOS Proof**
- Validate license class compatibility; attach matrix & signature.  
  **BS3. Portal Exposure**
- Proof viewer with verifiable signatures; CSV/JSON download.  
  **Acceptance:** Exports without valid proofs are blocked; viewer renders signatures.

### EPIC BT — Black‑Cell Offline Bundle (Must)

**BT1. Build**

- Deterministic tarball: images, policies, fixtures, dashboards, checksums, SBOM, runbooks.  
  **BT2. Offline Verify**
- `ig-offline verify` validates hashes/signatures; smoke tests pass in air‑gapped env.  
  **BT3. Resync Plan**
- Ledger replay + export ingest; conflict resolution strategy.  
  **Acceptance:** Clean‑room validates bundle; resync demo completed with audit logs.

### EPIC BU — Deprecation Enforcement (Should)

**BU1. Policy & Windows**

- Deprecation metadata (start/end); grace windows; exemptions process.  
  **BU2. Gates & Shims**
- CI gate blocks usage after end; auto‑PR to migrate to vNext with shims.  
  **Acceptance:** One deprecated field blocked in staging; migration PR merged.

### EPIC BV — Tail Reduction & Hot Path Tuning (Should)

**BV1. Resolver Profiling**

- Identify 99th percentile offenders; add caches/indices/prefetch.  
  **BV2. Persisted Query Hints**
- Add server hints + bounded response shapes.  
  **Acceptance:** p99 read latency ↓ ≥ 20%; cache hit ratio ≥ 85% on hot queries.

---

## Acceptance Criteria & Verification

1. **CMK**: KMS/HSM rotation works; dual‑control enforced; reencryption resumable; field‑level decrypt latency ≤ +5ms p95.
2. **PETs v2**: ε budget accounting deterministic; manifests store ε; exhaustion blocks with clear error; override requires warrant and is logged.
3. **Proofs**: Export blocked without residency+license proofs; signatures verify; portal provides downloadable proof sets.
4. **Black‑Cell**: Offline verify passes; resync reproduces provenance chain; bundle reproducible from tag.
5. **Deprecations**: Gate blocks expired usage; migration auto‑PRs available; comms posted.
6. **Latency**: p99 improvement ≥ 20% with evidence dashboards.

---

## Architecture (Mermaid)

```mermaid
flowchart TD
  GW[Apollo Gateway] --> OPA[Policy]
  GW --> ENC[Envelope Encrypt/Decrypt]
  ENC --> KMS[KMS/HSM]
  subgraph PETs v2
    ACC[ε Accountant]
    DP[DP Planner]
  end
  GW --> DP --> ACC
  subgraph Export
    EXP[Export Service]
    RESP[Residency Proof]
    LICP[License Proof]
  end
  GW --> EXP --> RESP
  EXP --> LICP
  subgraph Black‑Cell
    BLD[Offline Bundle Build]
    OFF[ig‑offline verify]
    RES[Resync]
  end
  BLD --> OFF --> RES
```

---

## Schemas & Models

**CMK Metadata (PG)**

```sql
CREATE TABLE IF NOT EXISTS tenant_cmk (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  key_arn TEXT NOT NULL,
  last_rotated TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','suspended'))
);
```

**Privacy Budget (PG)**

```sql
CREATE TABLE IF NOT EXISTS dp_budget (
  tenant_id TEXT,
  window_start TIMESTAMPTZ,
  epsilon_spent NUMERIC,
  epsilon_limit NUMERIC,
  PRIMARY KEY (tenant_id, window_start)
);
```

**Export Manifest (v1.4)**

```json
{ "items":[...],"residencyProof":"sha256:...","licenseProof":"sha256:...","dp":{"epsilon":0.5,"accountant":"sha256:..."} }
```

---

## Implementation Scaffolds

**Envelope Encrypt (TS extract)**

```ts
// generate data key via KMS -> encrypt payload -> store key id + ciphertext; decrypt on read with cache
```

**Rotate & Re‑encrypt Worker**

```ts
// iterate records -> rewrap/recrypt in batches; checkpoint; resume if interrupted
```

**ε Accountant (TS)**

```ts
// compute spend per query type; persist to dp_budget; deny when over limit
```

**Export Proof Generator**

```ts
// traverse trace graph -> build region route map -> cosign sign -> attach to manifest
```

**ig‑offline CLI**

```bash
ig-offline verify --bundle ig-blackcell-v1.4.tgz --manifest manifest.json --key cosign.pub
```

**Deprecation Gate (CI)**

```yaml
- name: Deprecation Check
  run: node scripts/deprecations-check.js --deadline-table deprecations.yaml
```

**Tail Tuning Checklist**

```
N+1 check -> composite index -> cache TTL -> prefetch edges -> bounded response
```

---

## Dashboards & Alerts

- **Dashboards:** CMK events & decrypt latency, ε budget remaining/spend, export proofs, offline verify results, deprecation usage, p99 tails & cache hits.
- **Alerts:** CMK rotation failure; ε budget < 10%; export without proof attempt; offline verify fail; deprecation past deadline; p99 regression.

---

## Runbooks (Delta)

- **CMK Lockout:** Use break‑glass with dual‑control; rotate keys; reconcile ledger; notify tenants.
- **Budget Exhausted:** Communicate window reset; consider ε top‑up with warrant; log override.
- **Proof Failure:** Block export; regenerate proofs; RCA on missing region tag or license class.
- **Offline Drift:** Rebuild bundle; compare manifests; resync ledger; document deltas.
- **Deprecation Violation:** Auto‑open migration PR; contact owners; apply shim; set timeline.

---

## Evidence Bundle (v1.4)

- CMK rotation logs + decrypt latency histos; DP budget accountant logs + manifests; export residency/license proofs; Black‑Cell verify outputs + resync logs; deprecation gate reports; p99 tuning dashboards; SBOM/provenance deltas.

---

## Backlog & RACI (Sprint‑12)

- **Responsible:** MC, Platform Eng, SRE, SecOps, Legal/Privacy, QA, Docs.
- **Accountable:** Head of Platform.
- **Consulted:** FinOps (KMS cost), DPO (PETs), Customer Success (Black‑Cell), Product (deprecations).
- **Informed:** Workstream leads.

Tickets: `MC‑577..MC‑642`; dependencies: KMS/HSM setup, portal pages for proofs, clean‑room env.

---

## Next Steps (Kickoff)

- [ ] Wire CMK envelope crypto + rotate worker; run against fixture.
- [ ] Enable ε accountant + planner guard; publish docs + portal widget.
- [ ] Attach export‑time residency + license proofs; block on missing.
- [ ] Build Black‑Cell offline bundle; validate in clean room; demo resync.
- [ ] Turn on deprecation gate; ship first enforced migration.
- [ ] Execute tail‑tuning tasks; publish p99 improvement evidence.
