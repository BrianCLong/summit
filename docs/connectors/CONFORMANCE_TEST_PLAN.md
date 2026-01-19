# Connector conformance test plan (automated gates)

This is the **test suite** a connector must pass to be “Certified Bronze/Silver/Gold.” Think of it as a harness we run in CI against a sandbox tenant for each source system.

### Test harness inputs

- `TENANT_A`, `TENANT_B` (two isolated tenants)
- `ROLE_ADMIN`, `ROLE_APPROVER`, `ROLE_REQUESTER`, `ROLE_AUDITOR`
- Source sandbox credentials (scoped OAuth) for each tenant
- Seed dataset generator (creates N objects, relationships, permission changes, deletions)

### Core invariants (must hold for every connector)

- **Idempotency:** replaying the same event batch produces no duplicates.
- **Determinism:** same cursor range → same results (modulo external changes, which must be represented as diffs).
- **Tenant isolation:** data from TENANT_A never appears in TENANT_B.
- **Provenance completeness:** every ingest/action emits a signed receipt + manifest hashes.
- **Redaction correctness:** role-based views hide restricted fields but preserve verifiability.
- **Policy binding:** every operation references a policy decision trace ID.

---

### Bronze (Ingest) — Required tests

**B1. Discoverability**

- `discover()` returns:
  - connector name/version
  - supported object types
  - required scopes
  - capabilities flags: ingest/action/verify
- Fails if any required metadata missing.

**B2. Authorization binding**

- `authorize()` binds token → `tenant_id` and `principal_id`.
- Negative: attempt to reuse token across tenants must fail.

**B3. Ingest happy path**

- Seed 100 objects + 200 edges.
- `sync(cursor=null)` returns objects + edges + `next_cursor`.
- Verify:
  - stable entity IDs / mapping keys
  - required fields present
  - `IngestReceipt` emitted and signature verifies

**B4. Incremental sync correctness**

- Modify 10 objects; delete 5; add 7.
- `sync(cursor=previous)` returns correct delta.
- Verify counts in receipt match actual applied changes.

**B5. Idempotent replay**

- Re-run the same `sync()` result application twice.
- Verify no duplicates, no double-counted edges, and receipt shows `dedupe_applied=true` (or equivalent).

**B6. DLQ and replay**

- Force transient failures (rate limit, 500).
- Verify:
  - items go to DLQ with reason codes
  - `replay(dlq_item)` succeeds
  - receipt chain links the replay to original attempt

**B7. Rate-limit behavior**

- Simulate 429/limit headers.
- Verify exponential backoff + bounded retries + metric emission (`rate_limit_hits`, `backoff_ms`).

**B8. Tenant isolation**

- Ingest TENANT_A and TENANT_B.
- Query graph: ensure no cross-tenant entities/edges.
- Verify receipts include correct tenant.

**B9. Minimal data + field allowlist**

- Connector must support field allowlist (or equivalent config).
- Verify sensitive fields are absent when disallowed.

---

### Silver (Actions) — Additional required tests

**S1. Policy preflight required**

- Attempt `execute()` without a policy decision reference → must fail.
- With policy allow → proceeds.
- With policy deny → denied with reason.

**S2. Approval chain required**

- Run an action requiring approval.
- Verify:
  - approval recorded (principal, time, rationale)
  - execution references that approval
  - `ActionRunReceipt` contains approvals and policy trace

**S3. TTL / compensation (if action supports temporary grants)**

- Execute temporary access with TTL=10m.
- Verify automatic revoke runs and emits a receipt.

**S4. Exactly-once semantics (as seen by our system)**

- Force network retry after remote system accepted change.
- Connector must detect duplicate via remote correlation ID and not create double side effects.
- Receipt must include remote change ID(s).

**S5. Redaction enforcement in receipts**

- Action input contains secrets/PII.
- Verify receipt has redacted fields but still hashes a canonical payload for integrity.

---

### Gold (Verify checks + compliance-ready) — Additional required tests

**G1. Verify checks completeness**

- `verify(control_id)` returns:
  - pass/fail
  - evidence pointers (object IDs, timestamps)
  - remediation hint (optional)
- Must emit `ControlCheckReceipt`.

**G2. Evidence bundle exportability**

- Generate Evidence Bundle for a control set.
- Verify:
  - `EvidenceBundleManifest` includes receipt references
  - signatures validate
  - selective disclosure works by role (auditor vs requester)

**G3. Chaos limits**

- Load test ingest to quota boundaries.
- Verify system remains stable, resumes from cursors, and produces bounded DLQ.
