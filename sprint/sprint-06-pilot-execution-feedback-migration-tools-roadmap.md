# Sprint +6 (2 weeks): Pilot Execution + Feedback Loop + Migration Tools + v1.1
# Roadmap Lock

**Sprint Goal:** Run the first real pilot(s) on Switchboard (hosted or
white-label), instrument the full adoption funnel, fix the top friction points
fast, and ship migration/import tools so partners can bring real data without
engineering heroics.

**Readiness Reference:** Summit Readiness Assertion
(`docs/SUMMIT_READINESS_ASSERTION.md`).

**Core Operating Rule:** Never defend the past. Only assert the present and
dictate the future. Evidence-first, reversible, governed.

---

## Evidence Bundle (UEF)

- Sprint scope record: this document.
- Authority references: `docs/SUMMIT_READINESS_ASSERTION.md`,
  `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`.
- Status linkage: `docs/roadmap/STATUS.json` initiative
  `sprint-plus-6-pilot-execution`.

---

## 23rd-Order Implications (Compressed)

1. **Activation telemetry becomes governance input.** Pilot funnel metrics feed
   policy tuning and roadmap gates.
2. **Receipts become the system’s ground truth.** All pilot actions must be
   traceable to receipts to enable auditability and friction triage.
3. **Import determinism prevents integrity drift.** Idempotent imports with
   signed error manifests avoid silent divergence across tenant environments.
4. **Friction fixes are operational debt if not policy-aware.** Every fix must
   declare policy impact and receipts to protect integrity.
5. **Parity checks compress time-to-green.** Environment drift detection
   becomes a prerequisite for cutover readiness.
6. **Feedback with context eliminates ambiguity.** Screen/action/policy IDs
   bind qualitative signals to the timeline for rapid remediation.
7. **Roadmap lock becomes testable.** Spec-ready items require metric targets,
   policy plan, test plan, and operability plan.
8. **Runbook imports anchor adoption.** Quick wins enable “first command” and
   “first incident” without bespoke engineering.
9. **Feature flags become safety valves.** Pilot fixes must ship behind ramps
   to avoid broad blast radius.
10. **Weekly active operators becomes a leading indicator.** WAU ties directly
    to retention, not vanity metrics.
11. **Approval throughput becomes health signal.** Slow approvals indicate
    policy friction or UI ambiguity.
12. **Incident usage validates runbooks.** Low usage signals runbook gaps or
    incident process friction.
13. **Feedback loops replace static QA.** In-product reporting becomes the new
    top-10 issue intake.
14. **Signed error manifests enable audit.** Rejections must be verifiable and
    reversible, not hidden.
15. **Imports define partner cost-to-onboard.** Dry-run diffs set expectations
    and reduce escalation load.
16. **Cutover rehearsal becomes a proof artifact.** A staged run becomes
    evidence in governance records.
17. **Policy-gated imports defend the trust boundary.** No data ingress without
    policy approval and receipts.
18. **Telemetry drives v1.1 ROI.** Drop-off points define the backlog, not
    intuition.
19. **Top-10 issue SLA compresses feedback loops.** 72-hour resolution becomes
    the operational baseline.
20. **Receipts unify observability.** A single canonical ID links metrics,
    logs, policy decisions, and UI events.
21. **Spec-ready is a release gate.** Items without tests, policy, and
    operability are deferred.
22. **Partner trust grows from predictability.** Deterministic imports and
    parity checks reduce pilot risk.
23. **Pilot success is a governance artifact.** Evidence bundles define go/no-go
    readiness.

---

## MAESTRO Alignment (Security & Threat Modeling)

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability,
  Security.
- **Threats Considered:** goal manipulation, prompt injection, tool abuse,
  drifted policy bundles, import tampering, receipt forgery.
- **Mitigations:** policy-gated imports, signed error manifests, deterministic
  receipt IDs, parity checks, feature-flag ramps, evidence bundles with
  hash-anchored references.

---

## Architecture (Pilot Execution Plane)

```
Partner Admin UI
  ├─ Guided Setup Checklist ─┐
  ├─ Success Dashboard       ├─► Tenant Telemetry Store
  ├─ Feedback Capture ───────┘         │
  └─ Import Console (dry-run/commit)   │
                                       ▼
Policy Engine ──► Receipts & Decisions ──► Evidence Bundle / Timeline
                                       │
                                       └─► Parity Report + Cutover Runbook
```

---

## 1) Pilot Program “in-product” (activation → adoption → retention)

**Deliver**

- Pilot “Success Dashboard”: activation steps complete %, weekly active
  operators, approvals throughput, incident/runbook usage.
- In-product guided setup: checklists + “done” receipts for each step (IdP,
  tenant config, first command, first approval, first incident, first evidence
  export).
- Feedback capture: quick prompts + “report friction” that attaches context
  (screen, action id, policy decision id).

**Acceptance**

- Funnel metrics computed per tenant and visible to partner admins.
- Feedback submissions link to receipts and relevant timeline segment.

---

## 2) Data migration & import tools v1 (partners bring their world)

**Deliver**

- Importers (choose the 2 most common for pilots):
  - Identities/roles (CSV/SCIM-export style)
  - Runbooks (YAML/JSON)
  - Incidents (CSV)
  - Entities/edges (graph seed)
- Validation + dry-run: show what will be created/updated and what’s rejected.

**Acceptance**

- `POST /imports` supports dry-run + commit; both are policy-gated and emit
  receipts.
- Import is idempotent; partial failures produce a signed error manifest.

---

## 3) Stabilization sprint inside the sprint (top 10 issues SLA)

**Deliver**

- “Top 10 pilot issues” board with owners + SLA: fix or mitigate in 72 hours.
- Feature flags/ramps used to ship fixes safely per tenant.

**Acceptance**

- 90% of pilot-blocking bugs resolved within sprint.
- Every pilot fix has: test, policy impact note, perf/cost note, and receipt
  coverage.

---

## 4) Partner ops: migration playbooks + environment parity

**Deliver**

- “Partner cutover” playbook: staging→prod migration steps, rollback, comms
  templates.
- Environment parity checks: config drift detection for policy bundles, OAS
  versions, feature flags.

**Acceptance**

- `GET /env/parity` (or equivalent report) shows mismatches and how to resolve.
- Cutover run executed in staging with receipts and a post-run report.

---

## 5) v1.1 roadmap lock based on telemetry

**Deliver**

- Data-driven roadmap doc: top workflows, drop-off points, most common denies,
  slowest queries, highest cost actions.
- v1.1 backlog with acceptance tests drafted (“Spec Ready” gate).

**Acceptance**

- Roadmap items each have: metric target, policy plan, test plan, operability
  plan.

---

## Out of scope (Sprint +6)

- New major domains unless pilots demand it (focus on import + activation +
  fixes).
- Large UI redesigns (only targeted friction fixes).

---

## Ordered Backlog

1. Success dashboard + guided setup checklist + receipts
2. Feedback capture + context linking to receipts/timeline
3. Import framework (dry-run/commit/idempotent)
4. Two priority importers + error manifest signing
5. Top-10 issue burn-down via flags/ramps
6. Cutover playbook + parity report + staging run
7. v1.1 roadmap lock doc + “Spec Ready” artifacts for top items

---

## Definition of Done (DoD)

- At least 1 pilot tenant completes guided setup end-to-end.
- Import dry-run/commit works for real partner data.
- Top 10 pilot issues burned down with evidence (tests + receipts).
- Cutover rehearsal documented with receipts + report.
- v1.1 roadmap locked with metric targets + spec-ready entries.

---

## Pilot Demo Script

1. New pilot tenant lands → completes checklist (IdP → first approval → first
   incident).
2. Import runbooks via dry-run → show diff → commit → launch runbook.
3. Submit feedback from a blocked action → show linked receipt + policy
   decision.
4. Show Success Dashboard with activation + WAU + cycle time metrics.
5. Show parity report + cutover rehearsal artifact.
6. Walk v1.1 roadmap items tied to telemetry.

---

## Implementation Matrix (Workstreams → Artifacts)

| Workstream | Artifact | Owner | Evidence |
| --- | --- | --- | --- |
| Success Dashboard | Metrics schema + dashboard spec | Pilot Ops | Receipts + tenant metrics |
| Guided Setup | Checklist + receipt hooks | Product | Receipts + completion trail |
| Feedback Capture | Prompt + context payload | Product | Feedback receipt + timeline link |
| Import Framework | API contract + dry-run diff | Platform | Signed error manifest |
| Importers | CSV/JSON/YAML parsers | Platform | Idempotency proof |
| Stabilization | Top-10 board + SLA | Eng | Fix receipts + tests |
| Parity Check | Drift report | Ops | Parity receipts |
| Roadmap Lock | Telemetry-driven doc | Product | Spec-ready checklist |

---

## Test & Evidence Plan

- Unit tests for import validation, idempotency, and manifest signing.
- Integration tests for `POST /imports` dry-run + commit policy gating.
- Smoke tests: guided setup completion, feedback receipt generation, dashboard
  metrics rendering.
- Evidence artifacts: receipts, parity report, cutover rehearsal report.

---

## Rollback & Reversibility

- Revert to prior pilot config via feature flag rollback.
- Import rollback through signed error manifest + idempotent re-apply.
- Cutover rollback steps documented in the partner playbook.

---

## Observability & Metrics

- Activation funnel: step completion rates, time-to-first-command.
- Adoption: WAU, approvals throughput, incident usage frequency.
- Import success rate: dry-run pass %, commit success %, rejection reasons.
- Friction: feedback counts per screen/action/policy decision.

---

## Governance & Decision Ledger

- Changes requiring compliance review recorded in DecisionLedger.
- Any exception is a governed exception with explicit rationale.
- Policy versioning tracked in `packages/decision-policy/`.
