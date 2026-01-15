# Sprint Issue Pack — Maestro Conductor White-Label Kit v1 + Hosted SaaS Beta Readiness

**Dates (America/Denver):** Mon **Feb 2, 2026** → Fri **Feb 13, 2026**

**Governance alignment (authoritative):**

- **Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md`
- **Constitution + Meta-Governance:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- **Agent Mandates + GA Guardrails:** `docs/governance/AGENT_MANDATES.md`, `docs/ga/TESTING-STRATEGY.md`
- **Policy-as-Code Canon:** `server/src/policies/` (all regulatory logic)

**Core operating rule:** Never defend the past. Only assert the present and dictate the future.

**Sprint theme:** Make Maestro sellable: brandable, policy-profiled, self-serve tenant onboarding, and production SRE-ready.

**Definition of Done (authoritative outcomes):**

1. **Deploy Maestro in 3 modes** with documented TCO knobs: **Internal / White-Label / Hosted SaaS**.
2. **Ship White-Label Kit v1**: theming/branding, role catalogs, policy profiles, seed data, partner quick-start.
3. **Hosted SaaS beta controls**: tenant lifecycle automation, billing hooks, support tooling, and safe ops (ramp/kill, DR, purge).
4. **Compliance-ready evidence pack**: exportable audit/evidence bundles per tenant + DPIA/retention templates + access logs.
5. **Performance gates**: p95 critical flows < **1.5s**, p99 error rate < **0.5%** on representative load.

---

## Global labels and CI gates (apply to every ticket)

**Labels:** `policy`, `switchboard`, `sre`, `finops`, `compliance`, `governance` (add as relevant)

**CI gates (required):**

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `make smoke` (golden path)
- `node scripts/check-boundaries.cjs`

**Evidence artifacts:** attach receipts, logs, exports, and perf baselines to the evidence bundle path in `evidence/` per tenant.

---

## Epic 1 — White-Label Kit v1 (Brand + Config + Policy Profiles)

### Story 1.1 — Brand pack system (runtime theming + receipt)

**Acceptance Criteria:**

- Switchboard loads tenant/partner theme at runtime without rebuild.
- Theme change emits a **config receipt** (provenance).
- Brand pack includes theme tokens, logos, name/URLs, partner nav/labels.

**Ticket 1.1.1 — Brand pack schema + loader**

- **Labels:** `switchboard`, `policy`, `compliance`
- **Scope anchors:** `server/src/services/brand-packs/`, `server/src/provenance/`
- **Tasks:**
  - Define brand pack schema + validation.
  - Add loader and cache invalidation.
  - Emit provenance receipt on apply.
- **Evidence:** Receipt JSON + config diff, stored under `evidence/`.

**Ticket 1.1.2 — Switchboard runtime theming**

- **Labels:** `switchboard`
- **Scope anchors:** `apps/web/`
- **Tasks:**
  - Runtime theme provider wired to tenant context.
  - Live theme refresh without rebuild.
- **Evidence:** Screenshot + runtime switch log.

### Story 1.2 — Policy profile library

**Acceptance Criteria:**

- Profiles: `internal-default`, `regulated`, `partner-demo`, `hosted-saas`.
- Assigning a profile updates OPA bundles and is replayable.
- Policy simulation reflects profile immediately.

**Ticket 1.2.1 — Profile definitions + OPA bundle mapping**

- **Labels:** `policy`, `compliance`
- **Scope anchors:** `server/src/policies/`, `opa/`
- **Tasks:**
  - Define profile manifests with versioning + checksum.
  - Map profiles to OPA bundles and store references.
- **Evidence:** Bundle manifest + checksum log.

**Ticket 1.2.2 — Profile assignment + replay receipts**

- **Labels:** `policy`, `compliance`, `sre`
- **Scope anchors:** `server/src/services/policy-profiles/`, `server/src/provenance/`
- **Tasks:**
  - Add profile assignment endpoint.
  - Emit receipt with decision ID and bundle version.
  - Ensure simulator re-reads active profile.
- **Evidence:** Receipt + simulator output capture.

### Story 1.3 — Seed data + quick-start demo tenant

**Acceptance Criteria:**

- “Demo tenant” bootstraps with one-click.
- Includes a runnable workflow + evidence export.

**Ticket 1.3.1 — Demo tenant seed template**

- **Labels:** `switchboard`, `compliance`
- **Scope anchors:** `server/src/services/tenants/seed/`
- **Tasks:**
  - Add demo tenant template and workflow seed.
  - Provide bootstrap endpoint/action.
- **Evidence:** Seed receipt + workflow run log.

**Ticket 1.3.2 — Demo evidence export validation**

- **Labels:** `compliance`
- **Scope anchors:** `server/src/provenance/`, `server/src/services/exports/`
- **Tasks:**
  - Validate compliance export on demo tenant.
  - Record export receipts + manifest.
- **Evidence:** Export bundle + manifest.

---

## Epic 2 — Hosted SaaS Beta: Tenant Provisioning + Guardrails

### Story 2.1 — Automated tenant provisioning

**Acceptance Criteria:**

- `POST /tenants` results in usable tenant with isolated storage/graph partitions and baseline quotas.
- OIDC/SCIM hooks stubbed with contracts.

**Ticket 2.1.1 — Tenant provisioning pipeline**

- **Labels:** `sre`, `policy`, `compliance`
- **Scope anchors:** `server/src/services/tenants/`, `server/src/provenance/`
- **Tasks:**
  - Create tenant namespace + partitions + baseline quotas.
  - Emit provisioning receipt.
- **Evidence:** Receipt + tenancy isolation log.

**Ticket 2.1.2 — OIDC/SCIM contracts (stubs)**

- **Labels:** `sre`
- **Scope anchors:** `server/src/services/identity/`, `docs/`
- **Tasks:**
  - Provide stub endpoints + request/response contracts.
  - Document expected production integration behavior.
- **Evidence:** Contract docs + test responses.

### Story 2.2 — Support operations toolkit

**Acceptance Criteria:**

- Impersonation requires explicit policy + receipt.
- Support can generate a “tenant health bundle” without secrets/PII (redaction enforced).

**Ticket 2.2.1 — Policy-gated impersonation**

- **Labels:** `policy`, `compliance`
- **Scope anchors:** `server/src/services/support/`, `server/src/policies/`, `server/src/provenance/`
- **Tasks:**
  - Add impersonation flow with explicit policy gate.
  - Emit start/stop receipts.
- **Evidence:** Receipt chain + policy decision log.

**Ticket 2.2.2 — Tenant health bundle export**

- **Labels:** `sre`, `compliance`
- **Scope anchors:** `server/src/services/support/`, `server/src/services/exports/`
- **Tasks:**
  - Create diagnostics bundle with enforced redaction.
  - Verify no secrets/PII included.
- **Evidence:** Export bundle + redaction audit.

### Story 2.3 — Billing hooks v1

**Acceptance Criteria:**

- Usage export (CSV/JSON) is deterministic and matches last 30 days of metering totals.
- Webhook/event sink emits billing events.

**Ticket 2.3.1 — Usage export service**

- **Labels:** `finops`, `sre`
- **Scope anchors:** `server/src/services/billing/`
- **Tasks:**
  - Deterministic CSV/JSON export for 30-day window.
  - Snapshot identifiers for reproducibility.
- **Evidence:** Export file + checksum.

**Ticket 2.3.2 — Billing webhook/event sink**

- **Labels:** `finops`, `sre`
- **Scope anchors:** `server/src/services/billing/`, `events/`
- **Tasks:**
  - Emit billing events to webhook endpoint with retry + backoff.
  - Log receipts for delivery attempts.
- **Evidence:** Event log + delivery receipts.

---

## Epic 3 — Compliance & Trust Pack v1

### Story 3.1 — Evidence bundle “Compliance Mode”

**Acceptance Criteria:**

- Export includes access logs, admin changes, policy bundle versions, DR/restore proof receipts.
- Single export answers “who did what, why allowed, what changed.”

**Ticket 3.1.1 — Compliance export expansion**

- **Labels:** `compliance`, `policy`
- **Scope anchors:** `server/src/provenance/`, `server/src/services/exports/`
- **Tasks:**
  - Expand export to include access logs, admin changes, policy versions, DR receipts.
  - Bind policy decision context to receipts.
- **Evidence:** Compliance bundle + manifest.

### Story 3.2 — Retention + purge templates

**Acceptance Criteria:**

- DPIA + retention templates available.
- Purge workflow produces signed purge manifest + selective disclosure proof.

**Ticket 3.2.1 — DPIA + retention templates**

- **Labels:** `compliance`
- **Scope anchors:** `docs/`
- **Tasks:**
  - Publish DPIA template and retention schedules.
- **Evidence:** Documented templates under `docs/`.

**Ticket 3.2.2 — Purge manifest flow**

- **Labels:** `compliance`, `policy`
- **Scope anchors:** `server/src/services/data-retention/`, `server/src/provenance/`
- **Tasks:**
  - Implement purge workflow with signed manifest.
  - Emit receipts and selective disclosure bundle.
- **Evidence:** Purge manifest + receipt chain.

### Story 3.3 — Security supply chain hardening

**Acceptance Criteria:**

- Deployment blocked if signatures/attestations fail.

**Ticket 3.3.1 — SBOM + signing verification gate**

- **Labels:** `sre`, `compliance`
- **Scope anchors:** `scripts/`, `ci/`, `docs/`
- **Tasks:**
  - Enforce SBOM and signature/attestation checks in deploy.
  - Document verification behavior.
- **Evidence:** CI logs showing enforced gate.

---

## Epic 4 — Perf & Reliability Gate Sprint

### Story 4.1 — Perf test harness

**Acceptance Criteria:**

- p95 < 1.5s for start + approve flows; baseline report committed.

**Ticket 4.1.1 — Perf harness implementation**

- **Labels:** `sre`
- **Scope anchors:** `perf/`, `tests/`
- **Tasks:**
  - Add load scripts for start/cancel/approve/export.
  - Record p95/p99 metrics and baseline report.
- **Evidence:** Baseline report committed with metrics.

### Story 4.2 — SLO policies + auto-ramp reactions

**Acceptance Criteria:**

- SLO breach reduces ramp automatically and emits incident receipt.

**Ticket 4.2.1 — SLO to ramp controller**

- **Labels:** `sre`, `policy`
- **Scope anchors:** `slo/`, `server/src/services/ramp/`, `server/src/provenance/`
- **Tasks:**
  - Define SLOs and bind to ramp controller.
  - Emit incident receipts on breach.
- **Evidence:** Incident receipt + ramp change log.

### Story 4.3 — DR drill + chaos regression

**Acceptance Criteria:**

- Signer/OPA outage results in fail-closed for privileged ops.
- Restoration meets RPO/RTO targets in staging.

**Ticket 4.3.1 — Chaos drills + DR receipts**

- **Labels:** `sre`, `compliance`
- **Scope anchors:** `drills/`, `server/src/services/`, `server/src/provenance/`
- **Tasks:**
  - Run signer/OPA/storage throttling drills.
  - Capture fail-closed behavior and recovery receipts.
- **Evidence:** Drill report + receipts.

---

## Evidence & reporting cadence

- **Daily:** burnup + top risks in #sprint-room.
- **Mid-sprint:** checkpoint demo with evidence bundle snapshot.
- **End of sprint:** compliance evidence bundle + performance baseline report.

**Governed Exceptions:** Any legacy bypass must be documented as a **Governed Exception** with explicit owner, duration, and remediation plan in `docs/`.

**Finality:** This issue pack is authoritative for Sprint Feb 2–13, 2026.
