# CompanyOS Sprint 27 Plan — "Governance Fabric: Policy + Audit + Disclosure"

- **Sprint Window:** Mon **Jan 19, 2026** → Fri **Jan 30, 2026** (2 weeks, America/Denver)
- **Theme:** Make policy-governed, auditable operation real in the runtime—not just CI.
- **Golden Path Alignment:** Must keep `make smoke` green and preserve `/health`, `/health/detailed`, `/health/ready` readiness signals.
- **Stack Dependencies:** Grafana + multi-tier data stores + Maestro jobs remain baseline; canary + auto-rollback + Switchboard Compliance Suite already land and must stay wired into governance signals.

## Sprint Goal

Any sensitive action becomes policy-decided + audit-evidenced + exportable as a disclosure pack. A customer or internal compliance can ask: _“Who accessed/exported what, under which policy, and what evidence proves it?”_ and the system returns a generated artifact.

## Scope & Guardrails

- **Policy-as-code only:** All governance logic flows through the PDP; no ad-hoc bypasses.
- **Trace-first:** Every critical path must emit `trace_id` end-to-end (API → jobs → DB → audit events).
- **Evidence-ready:** Each epic produces artifacts under `.evidence/sprint-27/` (policy, audit, disclosure-pack, observability).
- **Operational safety:** Canary + rollback signals must remain visible on dashboards; health checks extend to policy bundle readiness.

## Epics & Stories

### Epic A — ABAC Policy Gate (Runtime)

**Objective:** Install a real PDP enforcing normalized context on critical paths.

- **Stories:**
  1. Policy context contract (`principal + tenant + purpose + classification`) typed and passed through resolvers/services.
  2. Enforce ABAC on 3 critical operations (export, investigation access, admin actions) using `policy.allow(...)` gating.
  3. Policy bundles versioned with semantic version + changelog stored in-repo or fetched via bundle client.
- **Acceptance:** 3 critical operations hard-block on deny with clear errors; each allow/deny emits an **audit event** (see Epic C).

### Epic B — Disclosure Packager (Export Controls Done Right)

**Objective:** One command generates a customer-ready disclosure pack with provenance and redaction.

- **Stories:**
  1. `disclosure-pack.zip` format with `manifest.json`, `policy-decisions.jsonl`, `queries.json`, `sbom.*`, `provenance.*` pointers.
  2. Central redaction utility for PII/secrets used by export payloads and structured logs.
  3. Export flow wires disclosure pack generation into the export endpoint / Maestro-style background job.
- **Acceptance:** Single export in dev/staging yields a disclosure pack with **policy decision trace** and **redacted payload**.

### Epic C — Immutable Audit Trail (Evidence or It Didn’t Happen)

**Objective:** Standardize audit events and persist them reliably.

- **Stories:**
  1. Schema: `event_id`, `ts`, `actor`, `tenant`, `action`, `resource`, `decision`, `reason`, `trace_id`, `hash_prev` (optional chain).
  2. Coverage for sensitive actions: export, auth events, data write/mutation, policy decisions.
  3. Read-only audit query endpoint gated by policy to avoid leaks.
- **Acceptance:** ≥90% of sensitive actions emit audit events including `trace_id` and are linkable to runtime logs/traces.

### Epic D — Observability Standardization (Trace IDs Everywhere)

**Objective:** Each request is correlated across services and evidence.

- **Stories:**
  1. Generate/accept `x-trace-id`, propagate through API → jobs → DB → logs/audit events.
  2. Golden dashboards (latency, error rate, queue depth, canary health) surface canary + rollback signals in one panel.
  3. Health readiness includes policy bundle availability + PDP health alongside existing deep checks.
- **Acceptance:** One-click search from an audit event to correlated logs (`trace_id`), canary/rollback signals visible on dashboard.

### Epic E — Merge-Train Hygiene

**Objective:** Reduce conflict drag and keep release cadence intact.

- **Stories:** Triage conflict-heavy PRs; enforce “author rebase required” for stale PRs (carry-over from v4.0.3).
- **Acceptance:** Conflict backlog reduced (target: -25% “blocked by conflicts” PRs).

## Evidence Depot (Sprint 27)

- `.evidence/sprint-27/policy/` — policy bundle version + decision samples.
- `.evidence/sprint-27/audit/` — schema + sample events + trace linkage.
- `.evidence/sprint-27/disclosure-pack/` — example pack + manifest.
- `.evidence/sprint-27/observability/` — dashboard JSON + alert rules.

## Exit Gates

- ✅ Policy enforcement live on 3 critical operations.
- ✅ Disclosure pack generated end-to-end (export → pack) with redaction.
- ✅ Audit trail emitted for ≥90% sensitive actions with trace correlation.
- ✅ Trace IDs correlate request ↔ audit ↔ logs; dashboards include canary + rollback.
- ✅ Merge-train friction reduced measurably (at least 25% drop in conflict-blocked PRs).

## Operating Notes

- Maintain `make smoke` and health endpoints as regression nets.
- Prefer policy-evaluated events over direct state mutation; preserve append-only audit trail.
- Escalate ambiguity to governance (no workarounds); keep evidence exportable as a disclosure pack for customer review.
