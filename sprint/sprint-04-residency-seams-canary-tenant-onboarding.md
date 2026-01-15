# CompanyOS Sprint 04 — Residency Seams + Canary Release + Tenant Onboarding

**Sprint window:** Mon Feb 16 → Fri Feb 27, 2026 (America/Denver)

## Sprint Goal

We can onboard a new tenant end-to-end, enforce basic data residency/retention at the seams, and ship with automated canary + rollback backed by synthetic probes and auditable evidence.

---

# Sprint Commit (what ships)

## Epic A — Tenant Onboarding Golden Path v1

**Outcome:** provisioning is repeatable, least-privilege by default, and leaves an audit trail you can hand to a customer.

### Stories

1. **`tenant create` workflow**
   - Create tenant + default roles + policy bindings + initial namespaces (DB/graph/index).
   - Emits: tenant manifest (`tenant.yaml`) with IDs, created resources, policy bundle hash.
   - **Acceptance:** running the command twice is idempotent; second run produces "no-op" and same manifest.

2. **Tenant teardown (safe, policy-checked)**
   - `tenant delete --dry-run` shows what will be removed, retention holds, and required approvals.
   - **Acceptance:** deletion is blocked if retention/legal-hold flags exist; deny is logged and user-visible.

### Evidence artifacts

- Runbook: "Tenant lifecycle"
- ADR: "Tenant resource model & idempotency guarantees"
- Integration tests: provision → operate → teardown (happy + deny paths)

---

## Epic B — Data Residency & Retention Seams v0 (enforcement points, not full geo)

**Outcome:** we enforce residency/retention at the boundaries and record decisions, even if full multi-region isn't shipped yet.

### Stories

1. **Data classification tags + retention policy hooks**
   - Add simple tags for datasets/artifacts: `public`, `internal`, `restricted`, `pii`.
   - Add retention metadata on exports, logs, and storage objects.
   - **Acceptance:** every export/report artifact carries classification + retention fields; missing tags fail CI/test.

2. **Residency "seam enforcement"**
   - Gate write paths with a residency decision (even if single region today):
     - "Allowed region" check
     - "Export destination" check
   - **Acceptance:** a simulated "wrong region" write/export is denied, logged, and recorded with a policy decision ID.

### Evidence artifacts

- ADR: "Residency seams & future multi-region plan"
- Policy tests: allow/deny matrix for residency + retention

---

## Epic C — Canary Manager + Automated Rollback v1

**Outcome:** releases stop being faith-based; we can detect regressions fast and revert automatically.

### Stories

1. **Canary deployment workflow**
   - Progressive rollout with steps (e.g., 1% → 10% → 50% → 100%).
   - Clear abort criteria (SLO burn, error rate, synthetic failures).
   - **Acceptance:** a synthetic-induced failure triggers abort; the system returns to the prior version automatically.

2. **Rollback playbooks are executable**
   - `rollback --to <release>` script + runbook.
   - **Acceptance:** rollback script works in staging; leaves an audit event with who/what/why.

### Evidence artifacts

- Runbook: "Canary + rollback"
- CI: "release drill" job that runs canary logic against a staging target

---

## Epic D — Synthetic Probes + "Release Confidence" Scorecard

**Outcome:** we have one page that answers: "is it safe to proceed?"

### Stories

1. **Synthetic probes for critical paths**
   - Auth/login, tenant-scoped query, export/report generation, job queue processing.
   - **Acceptance:** probes run on schedule; failures page the correct owner; probe results are attached to releases.

2. **Release confidence scorecard**
   - Minimal checklist auto-populated from gates:
     - policy tests pass
     - deterministic export tests pass
     - spec parity pass
     - canary completed
     - synthetic green
   - **Acceptance:** scorecard is generated per release and included in evidence bundle.

### Evidence artifacts

- "Golden dashboard" for synth + canary outcomes
- Release artifact: `release-scorecard.json`

---

# Non-goals (explicit)

- Full multi-region data plane
- Complex billing/entitlements
- Major UI redesign (only necessary onboarding surfaces)

---

# Definition of Done (hard gates)

A story is done only if:

- ✅ idempotent scripts + integration tests prove it
- ✅ deny paths are tested and auditable (policy decision recorded)
- ✅ runbook exists with "pager section" (symptoms → triage → rollback)
- ✅ release evidence includes scorecard + hashes + policy bundle version

---

# Sprint sequencing (how we'll execute)

- **Days 1–2:** Tenant onboarding workflow + manifests
- **Days 3–4:** Residency/retention seams + policy tests
- **Days 5–7:** Canary manager + rollback automation
- **Days 8–9:** Synthetic probes + scorecard wiring
- **Day 10:** Staging release drill + evidence review

---

# Top risks & controls

- **Risk:** Residency/retention becomes "paper only."
  **Control:** enforce at write/export boundaries and require deny-path tests.
- **Risk:** Canary signals are noisy and cause rollback thrash.
  **Control:** minimum sample windows + multi-signal abort (synthetic + error rate + SLO burn).
- **Risk:** Tenant lifecycle scripts drift from reality.
  **Control:** idempotency tests + "provision → operate → teardown" pipeline runs nightly.

---

# Follow-on (Sprint 05 preview)

If you want Sprint 05 after this, it naturally becomes: multi-region enablement (real), customer-facing tenant admin UI, and disclosure packs v1 with SOC mapping baked in.
