## Partner + Connector Certification Spec (so integrations become a growth flywheel)

### 0) Goals (what certification guarantees)

A certified connector guarantees:

* **Correctness:** stable schemas + deterministic mapping to our entity graph
* **Safety:** least privilege + permission-respecting ingest
* **Operability:** replayable ingest, DLQ, backfill, rate-limit handling
* **Provenance:** emits receipts and lineage edges consistently
* **Multi-tenant:** hard tenant partitioning + per-tenant metering

---

### 1) Connector interface contract (required)

**Connector types**

* **Ingest (pull):** periodic sync with cursors + backfill
* **Ingest (push/webhook):** event stream + dedupe/idempotency
* **Action:** executes changes in remote system (create/update/grant/revoke)
* **Verify:** read-only compliance checks (control evidence)

**Required endpoints / handlers**

* `discover()` → capabilities, scopes, object types
* `authorize()` → OAuth/OIDC scopes + tenancy binding
* `sync(cursor)` → returns objects + edges + next cursor
* `backfill(range)` → bounded historical pulls
* `replay(dlq_item)` → deterministic reprocessing
* `execute(action_request)` → action run with correlation IDs
* `health()` → latency/rate-limit status, last success, backlog depth

---

### 2) Provenance + Receipt requirements (non-negotiable)

Every connector must emit:

* **IngestReceipt**

  * tenant_id, connector_id, source, scopes, cursor, start/end times
  * counts: read/created/updated/deleted/skipped, errors
  * policy decision reference (why allowed to ingest)
  * signature + hash of payload manifest
* **ActionRunReceipt**

  * action_id, requester, approvers, policy preflight result, TTL (if any)
  * remote change IDs, outputs hashed, redactions applied
* **Lineage events**

  * `entity_id`, `source_object_id`, `observed_at`, `edge_type`, confidence

**Selective disclosure**

* Receipts support redaction rules by role/tenant policy
* Export bundles include “what was redacted and why” metadata

---

### 3) Security & privacy certification gates

**Gate S (Security)**

* Least privilege scopes documented + tested
* Secret handling: no plaintext secrets in logs; KMS integration supported
* Tenant isolation: connector cannot query cross-tenant data
* Dual-control support for destructive actions (if connector supports deletes)

**Gate P (Privacy)**

* Data minimization: fields allowlist; PII classification tags where possible
* Retention controls: configurable retention windows for cached data
* “No persistent indexing” mode supported when vendor policies require it

---

### 4) Reliability & operability gates

**Gate R (Reliability)**

* Idempotency: repeated events don’t duplicate entities/edges
* Replay: DLQ items can be replayed deterministically
* Rate-limit aware: backoff + jitter + quota telemetry
* Backfill performance: defined throughput + time bounds

**Gate O (Observability)**

* Metrics: ingest lag, success rate, error types, rate-limit hits, DLQ depth
* Tracing: correlation IDs across ingest/action → workflow run → receipt
* Runbooks: common failures + remediation steps shipped with connector

---

### 5) Certification levels (clear, marketable)

* **Bronze:** ingest only, receipts, basic metrics, tenant isolation
* **Silver:** ingest + actions + replay/DLQ + redaction support
* **Gold:** ingest + actions + verify checks + full lineage + compliance-ready exports + chaos-tested limits

Badge these in the connector directory and partner console.

---

### 6) Partner program mechanics

* **Connector SDK + conformance test suite** (must pass to certify)
* **Versioning rules:** semantic versioning; breaking schema changes require migration plan
* **Marketplace submission:** manifest + security review + sample tenant test
* **Revenue / incentives (later):** certified premium connectors as add-on SKU
