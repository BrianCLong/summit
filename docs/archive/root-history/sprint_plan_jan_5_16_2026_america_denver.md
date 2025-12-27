# Sprint Plan — Jan 5–16, 2026 (America/Denver)

**Codename:** Golden Path **Release** (post-Beta hardening)

---

## 1) Sprint Goal (SMART)

Ship a stable, demo-ready release of the **end-to-end golden path** with collaboration, hardened governance, and performance SLOs.

- **Authority Compiler v1.5**: templates + collaboration with auditability
- **License Registry v2**: policy-as-code + notifications and override SLAs
- **RBAC + Row-Level Security E2E**: tenant + role + row predicates enforced everywhere
- **Graph Query Performance & Caching**: hit rate and p95 within SLO on the golden set
- **Verifier v1.1**: cross-version manifest verification with rich CLI diagnostics
- **Report Studio v1.1**: redaction presets and PASS badge with verifier log link
- **Observability**: dashboards + alerts for query/export SLOs

> **Outcome:** A shippable Golden Path Release ready for stakeholder demos and early design partner onboarding.

---

## 2) Success Metrics & Verification

- **Authority Compiler collaboration**: template gallery usable; suggestions accept/reject path works; audit trail exported in manifest.
  - _Verify:_ manual flows + manifest artifact check.
- **Policy-as-code**: rego/policy unit tests green; override SLAs tracked; notifications emitted.
  - _Verify:_ policy test suite; notification webhook/email logs; SLA metrics.
- **RBAC + RLS**: predicates enforced for query and export; 20 contract tests pass; leakage test = 0.
  - _Verify:_ contract suite; leakage canary; blocked-action messaging includes owner.
- **Graph performance**: cache hit rate ≥ 40% on golden set; p95 latency meets target; stale-read guardrails hold.
  - _Verify:_ perf run on golden queries; cache metrics; invalidation tests.
- **Verifier v1.1**: semver check with backward compat for n-1; structured JSON output; correct exit codes for CI.
  - _Verify:_ CLI regression suite; JSON schema validation.
- **Report Studio**: presets apply consistently; PASS/FAIL badge accurate; log link opens verifier log.
  - _Verify:_ UI regression + export flow.
- **Observability**: dashboards saved for query p95/export success; alerts firing to on-call; runbook updated.
  - _Verify:_ dashboards snapshot; alert test to on-call; merged runbook PR.

---

## 3) Scope (Commit vs Stretch)

**Must-have (commit):** Stories REL-101 through REL-161.

- Authority Compiler v1.5 templates gallery, suggestion mode, accept/reject flow, manifest audit trail.
- License Registry v2 with policy-as-code (rego/policy) tests, notifications (email/webhook), override SLA timers.
- RBAC + RLS E2E predicates applied to query and export; blocked messaging with owner/why.
- Graph cache + invalidation; p95 perf gate + SLO panel.
- Proof/Manifest Verifier v1.1 (semver compat, n-1 support, structured JSON output, CLI diagnostics/exit codes).
- Report Studio v1.1 redaction presets + PASS badge with verifier log link.
- Observability and SLO dashboards/alerts for query p95 and export success; runbook update.

**Stretch (time-boxed):** REL-171 Materialized Views for heavy joins (two hot paths) + before/after comparison.

**Out of scope:** New feature creation outside the golden path; non-SLO workloads; major UI redesigns.

---

## 4) Backlog (Ready for Sprint)

| ID | Title | Owner | Est | Dependencies | Acceptance Criteria (summary) |
| --- | --- | --- | ---: | --- | --- |
| REL-101 | Authority Compiler: Templates Gallery | Designer+FE | 3 | — | Choose/apply template; persists with doc |
| REL-102 | Authority Compiler: Suggestions & Change Log | FE+BE | 5 | REL-101 | Suggest/accept/reject; audit trail export |
| REL-111 | License Registry: Policy-as-Code w/ Tests | BE | 5 | — | Policies versioned; unit tests green |
| REL-112 | License Notifications & Override SLAs | BE+Ops | 3 | REL-111 | Webhook/email; timers recorded |
| REL-121 | RBAC + RLS Predicates (API) | BE | 5 | — | Predicates enforced; 20 contract tests |
| REL-122 | RBAC + RLS UI Messaging | FE | 3 | REL-121 | Clear “blocked by + owner/why” |
| REL-131 | Graph Cache & Invalidation | BE | 3 | — | Hit-rate metric; safe invalidation |
| REL-132 | Query Perf Gate & SLO Panel | BE+Ops | 2 | REL-131 | p95 panel; alert wired |
| REL-141 | Verifier v1.1 (Semver + JSON CLI) | BE | 3 | — | n-1 compatibility; structured output |
| REL-151 | Report Studio: Redaction Presets + PASS Badge | FE | 3 | REL-141 | Presets apply; badge accurate |
| REL-161 | Canary + Rollback Runbook Update | Ops | 2 | — | Runbook PR merged; drill completed |
| REL-171* | Materialized Views for Heavy Joins | BE | 3 | — | Precompute two hot paths; compare perf |

> *REL-171 is stretch; only if capacity allows after commit scope is stable.*

---

## 5) Capacity & Calendar

- **Capacity:** ~40–42 pts (full team returning from holidays); commit 40 pts, stretch optional.
- **Working days:** 10 (no holidays in window).
- **Ceremonies (America/Denver):**
  - Sprint Planning: Mon Jan 5, 09:30–11:00
  - Daily Stand-up: 09:15–09:30
  - Mid-Sprint Refinement: Thu Jan 8, 14:00–14:45
  - Sprint Review (live demo): Fri Jan 16, 10:00–11:00
  - Retro: Fri Jan 16, 11:15–12:00

---

## 6) Environments, Flags, Data

- **Environments:** dev → stage (canary; auto-rollback & schema gates).
- **Flags:** `authorityCompilerCollab`, `licenseRegistryV2`, `rbacRlsE2E`, `graphPerfCacheV1`, `verifierV11`, `reportStudioV11`, `sloDashV1`.
- **Test Data:** Golden CSVs, fixture graphs, three curated evidence bundles, redaction preset pack, policy test suite.

---

## 7) Definition of Ready (DoR)

- Story has AC, dependencies, flags, test data, wire/API sketch; risks noted; rollback defined.

## 8) Definition of Done (DoD)

- All AC met; flags gated; stage demo script updated; user and ops docs merged.
- Unit + contract + one recorded E2E (“ingest → query → compile → export”) green.
- Security sign-off: RBAC+RLS tests, dependency scan no criticals.
- Observability: dashboards live; SLOs configured; alerts tested.

---

## 9) QA Plan

**Functional:**

- Templates/suggestions in Authority Compiler; audit trail export.
- Policy-as-code evaluation; notifications & override SLA timers.
- RBAC+RLS contract tests; clear “blocked by” messaging.
- Cache correctness (no stale leaks), perf gates, and invalidation tests.
- Verifier semver compatibility; CLI diagnostics & exit codes.
- Report Studio badge accuracy + link to verifier log.

**E2E:** ingest → query → compile → export with manifest verification and PASS badge.

**Non-functional:** p95 query SLO, export success SLO; error budget burndown; canary rollback.

---

## 10) Risks & Mitigations

- **RLS predicate complexity:** Centralize predicates; add golden fixtures + fuzz tests.
- **Cache staleness:** Explicit invalidation on write paths; TTL + etag; canary guard.
- **Policy-as-code regressions:** Version rules with unit tests; pre-merge policy CI.
- **Collaboration conflicts:** Suggestion mode default; optimistic locking + conflict UI.

---

## 11) Demo Script (review)

1. Upload dataset → Wizard maps → PII/blocked fields explained.
2. Ask NL question → Cypher preview → run sandbox; show cache on second run + p95 figure.
3. Authority Compiler: apply template, suggest/accept edits; citation integrity enforced.
4. Export report → manifest + `.pcq` verify across versions; PASS badge visible; open verifier log.
5. Trigger license override → owner notified → approve/deny → policy test proof.

---

## 12) Reporting Artifacts

- Burndown & throughput
- Risk register
- SLO dashboard snapshot (start/end)
- Demo script updates
- Release notes (stage)

---

## 13) Outcome of this Sprint

A shippable, demo-grade **Golden Path Release**: collaborative Authority Compiler, enforceable policy-as-code, end-to-end RBAC+RLS, fast/repeatable graph queries, versioned verifier, and exports that surface a clear PASS badge with full provenance. Ready to brief stakeholders and onboard early design partners.
