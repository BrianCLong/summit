# CTI→Control Subsumption Pipeline (Design + GA Readiness Pack)

## 0) Readiness escalation (law of consistency)

This plan is bound to the Summit Readiness Assertion and the governing Constitution; all artifacts below align to those authority files and require evidence-first execution to proceed. Reference: `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/governance/CONSTITUTION.md`.

## 1) Purpose & scope

**Objective:** Translate bounded CTI items into deterministic controls, detections, guardrails, tests, and evidence artifacts without narrative drift or unpinned claims.

**Scope:** Cloud security + software supply chain risk, with provenance-locked CTI snapshots and tenant-scoped telemetry.

**Core invariants**

- **Evidence-first:** No control or hunt is emitted without pointer-linked citations.
- **Enforcement/insight split:** Only deterministic, provenance-anchored outputs may enforce controls. Attribution remains hypothesis-only.
- **Determinism:** Same inputs → identical evidence artifacts (hash stability).
- **Tenant isolation:** All storage, caches, and evidence packs are tenant-scoped.

## 2) Architecture (services + APIs + storage)

### 2.1 Service map

```
[cti_ingest] -> [cti_extract] -> [cti_map] -> [control_emit]
                       |                |
                       |                +--> [hunt_pack_emit]
                       |
                       +--> [attribution_assist] (insight-only)
```

### 2.2 Services and responsibilities

**services/cti_ingest/**

- `POST /cti/items`: validate schema, snapshot sources, hash, store pointers.
- Output: normalized `cti_item` with provenance bundle.

**services/cti_extract/**

- `POST /cti/extract`: deterministic ruleset to produce claim ledger + TTP tags.
- Output: `claims.json` + `pointers.json`.

**services/cti_map/**

- `POST /cti/map`: map claims/TTPs to control catalog entries and hunts.
- Output: `controls.json` + `hunts.json` + `mapping.json`.

**services/cti_control_emit/**

- `POST /cti/emit`: emit evidence pack + policy diffs + guardrail PR payloads.

**services/attribution_assist/** (gated)

- `POST /cti/attribute`: produce hypotheses with citations and alternatives.
- Output: `hypotheses.json` (non-enforcing, no actor label without pointer).

### 2.3 Data stores / queues

- **Object store (tenant-scoped):** CTI snapshots, bounded excerpts, evidence packs.
- **Metadata DB:** items, claims, mappings, audit trail.
- **Queue:** `cti.ingest`, `cti.extract`, `cti.map`, `cti.emit`.
- **Evidence registry:** immutable index keyed by Evidence ID.

### 2.4 Tenant boundaries

- All records are keyed by `tenant_id`.
- Storage pathing: `s3://cti/{tenant_id}/...` or equivalent.
- Evidence registry enforces tenant scoping; no cross-tenant queries.

## 3) Canonical `cti_item` schema (authoritative)

**File path target:** `services/cti_ingest/schemas/cti_item.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.ai/schemas/cti_item.schema.json",
  "title": "CTI Item",
  "type": "object",
  "required": [
    "tenant_id",
    "item_id",
    "source_url",
    "snapshot_sha256",
    "snapshot_captured_at",
    "excerpts",
    "provenance"
  ],
  "properties": {
    "tenant_id": { "type": "string", "minLength": 1 },
    "item_id": { "type": "string", "minLength": 1 },
    "source_url": { "type": "string", "format": "uri" },
    "snapshot_sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "snapshot_captured_at": { "type": "string", "format": "date-time" },
    "excerpts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["text", "range"],
        "properties": {
          "text": { "type": "string", "minLength": 1, "maxLength": 2000 },
          "range": {
            "type": "object",
            "required": ["start", "end"],
            "properties": {
              "start": { "type": "integer", "minimum": 0 },
              "end": { "type": "integer", "minimum": 0 }
            }
          }
        }
      }
    },
    "provenance": {
      "type": "object",
      "required": ["ingested_by", "ingested_at", "pipeline_version"],
      "properties": {
        "ingested_by": { "type": "string" },
        "ingested_at": { "type": "string", "format": "date-time" },
        "pipeline_version": { "type": "string" }
      }
    }
  }
}
```

## 4) Enforcement vs. insight split (non-negotiable)

- **Enforcement outputs:** controls, guardrail PRs, CI gates, and policy diffs.
- **Insight outputs:** attribution hypotheses, alternative actors, confidence bands.
- **Rule:** no enforcement artifacts may depend on attribution-only outputs.

## 5) Offline determinism strategy

- Snapshot inputs (HTML/PDF) → hash and store.
- Fixed extraction rules and stable ordering.
- Seeded synthetic datasets for tests.
- Lockfile + dependency hashes recorded in `stamp.json`.
- Determinism check: identical inputs produce identical hashes and `report.json`.

## 6) PR dependency graph (clean-room, phased)

1. **PR-1: Ingest + provenance**
2. **PR-2: Extraction + pointer discipline**
3. **PR-3: Mapping + control catalog**
4. **PR-4: Supply-chain guardrails**
5. **PR-5: Identity abuse detectors**
6. **PR-6: Attribution assist (gated)**

## 7) Security threat model (MAESTRO aligned)

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

**Threats considered**

- Ingestion poisoning and prompt injection in snapshots.
- PDF parsing vulnerabilities and dependency compromise.
- Evidence tampering and hash drift.
- Cross-tenant leakage.
- Tool abuse and unauthorized enforcement.

**Mitigations**

- Sandbox parsing and allowlist-only formats.
- Hash-locked snapshots and immutable evidence registry.
- Pointer discipline: “no-claim-without-pointer” CI gate.
- Tenant-scoped storage keys and query filters.
- Enforcement/insight split with policy checks.

## 8) Policies (must enforce)

- **No-claim-without-pointer:** every claim must cite at least one excerpt range.
- **Attribution cannot enforce:** hypotheses are quarantined from control emission.
- **Evidence immutability:** Evidence IDs must be deterministic and recorded.
- **Decision reversibility:** any autonomous change must be recorded in DecisionLedger with rollback path.

## 9) Evaluations + regression tests

**Determinism test**

- Same fixtures → identical hashes and `report.json`.

**Pointer integrity test**

- All claims must have ≥1 citation anchor referencing excerpt ranges.

**Mapping golden tests**

- Expected controls for destructive incident + developer phishing fixtures.

**Supply-chain FP budget**

- Typosquat detector below fixed FP threshold on clean corpus.

**Identity replay tests**

- Injected impossible travel + spray patterns detected with stable metrics.

**Attribution safety tests**

- No actor names emitted without pointer-backed claims.

## 10) Evidence artifacts (machine-verifiable)

**Evidence ID pattern:** `EVID-cti-YYYYMMDD-<sha256_8>`

**Required per run**

- `stamp.json`: commit, pipeline_version, lockfile hash, seed, timestamp.
- `metrics.json`: ingestion %, parse errors, mapping coverage, FP metrics, perf stats.
- `report.json`: normalized CTI item, claims, pointers, mapped controls, hunts.

**`metrics.json` fields (minimum)**

- `ingest.success_rate`
- `ingest.parse_error_count`
- `extract.claim_count`
- `extract.pointer_coverage`
- `map.control_coverage`
- `map.hunt_coverage`
- `supply_chain.false_positive_rate`
- `identity.detection_rate`
- `perf.ingest_ms`, `perf.extract_ms`, `perf.map_ms`

## 11) Ops plan (GA readiness)

**Topology**

- Stateless services behind API gateway.
- Evidence registry + object store per tenant region.
- Offline mode reads fixtures + local artifact store.

**SLOs**

- Ingest success ≥ 99%.
- Evidence determinism ≥ 99% on fixtures.
- FP budget maintained on typosquat tests.

**Runbooks**

- Source down: fallback to cached snapshot + alert.
- Hash drift: quarantine output, block enforcement, open incident.
- FP spike: disable guardrail PR emission, log DecisionLedger entry.
- Evidence mismatch: invalidate pack and re-run with locked inputs.

**Rollback strategy**

- Disable emitters, retain evidence, revert policy diffs, re-run determinism checks.

## 12) Product spec (MVP + acceptance)

**Personas**

- Security analyst, AppSec engineer, Platform engineer, Compliance lead.

**UX flow**

1. CTI item ingested → claim ledger.
2. TTP mapping → control candidates + hunt packs.
3. Guardrail PR draft → approval + evidence attached.
4. Evidence pack → immutable record and audit link.

**Packaging**

- Base: ingestion + claim ledger + evidence.
- Pro: mapping + hunt packs.
- Enterprise: guardrail PRs + attribution assist (gated).

**TTG (Time-to-Guardrail)**

- Time from snapshot to merged guardrail with evidence pack.

**MVP scope**

- PR-1 to PR-3, with tests and evidence pack.

**Must-not-ship risks**

- Non-deterministic extraction.
- Missing pointers.
- Attribution outputs used for enforcement.

**Acceptance criteria (GO/NO-GO alignment)**

- Determinism ≥ 99% on fixtures.
- Pointer integrity = 100%.
- FP budget under threshold.
- Attribution safety tests pass.

## 13) Evidence-first operating posture

All outputs must ship with raw evidence bundles (UEF) before narrative summaries. Narrative summaries are permitted only after evidence artifacts validate.
