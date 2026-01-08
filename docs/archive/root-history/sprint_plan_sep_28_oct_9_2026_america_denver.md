# Sprint 21 — Sep 28–Oct 9, 2026 (America/Denver)

> **Theme:** “Make trust visible, self-serve, and viral”
> **Sprint Goal:** Turn our provable posture into a market-facing advantage via a Trust Center, self-serve verification tools, and industry compliance packs.

---

## 1) Target Outcomes (Measurable)

1. **Trust Center:** Public/customer-facing Trust Center v1 stays current automatically (no manual scramble).
2. **Verification UX:** Customers verify evidence bundles/receipts self-serve (offline + UI) in **< 5 minutes**.
3. **Industry packs:** Ship **2** industry compliance packs (starter) with mapped controls + evidence automation hooks.
4. **Procurement velocity:** Cut security review cycles by **30%** for pilots using the new assets (timestamp-based).
5. **Integrity:** Trust Center claims link to verifiable artifacts (digests, signatures, proofs) — no marketing-only claims.

---

## 2) Scope (What Ships)

### Epic A — Trust Center v1 (customer-facing)

- **A1. Trust Center content model:**
  - Sections: Security architecture overview; Compliance posture + roadmap; Incident history + postmortem summaries (redacted); DR posture (RPO/RTO + last drill evidence); Supply chain security (SBOM/SLSA/signatures); Privacy & data handling (retention, purge, residency).
  - Every entry backed by a signed artifact or dashboard digest.
- **A2. Automated publishing pipeline:**
  - Scheduled job compiles latest Trust Reports, SLA summaries, DR drill status, vulnerability scan summary.
  - Generates a signed “Trust Center Snapshot” bundle.
  - Human-in-command approval required for public publish.
- **A3. Tenant-specific view (Enterprise):**
  - Shows customer’s own posture + evidence exports (more detailed than public).

### Epic B — Customer verification tools (make auditors happy)

- **B1. Verification CLI packaging:** `summit verify bundle <file>`, `summit verify receipt <id>`, `summit verify purge-manifest <file>` producing a clean verification report (pass/fail + what was checked).
- **B2. Switchboard “Verify” panel:** Drag/drop evidence bundle → verify signatures, inclusion proofs, schema validity; explain failures (missing proofs, expired cert, mismatched digest, etc.).
- **B3. Auditor workspace improvements:** Guided verification checklist + exportable verification report.

### Epic C — Industry compliance packs (2 packs)

- Pick two based on ICP (e.g., Healthcare HIPAA starter; Finance SOC2 + PCI-lite + FFIEC-ish; Government FedRAMP pre-read; Education FERPA starter).
- **C1. Pack contents:** Control mapping, required policies (OPA overlays), evidence jobs configuration, runbooks + audit checklist, scope statement.
- **C2. Pack install:** Tenant applies pack via Switchboard (requires approvals, emits receipts, produces an initial “Compliance Baseline Report” bundle).

### Epic D — Procurement accelerators

- **D1. Security questionnaire auto-fill (v2):** Answer pack with Trust Center snapshot references, pack-specific language, verification instructions.
- **D2. Evaluation kit v2:** 30-day evaluation plan auto-generated per prospect (onboarding checklist, trust report cadence, success metrics, exit criteria).

---

## 3) Explicit Non-goals

- Claiming full certification (SOC2 Type II, FedRAMP ATO) unless actually completed.
- Replacing a formal GRC platform (we provide evidence + mapping + automation).

---

## 4) Definition of Done (Hard Gates)

- Trust Center snapshot auto-generated from real artifacts and verifiable.
- Verification CLI + Switchboard Verify panel pass test vectors.
- Two compliance packs installable, policy-gated, and generate baseline evidence bundles.
- Security Answer Pack v2 links to Trust Center + verification steps.
- Runbooks exist for Trust Center publish failures and verification tool issues.

---

## 5) Sprint Demo (Live Scenario)

1. Trust Center shows current posture + last DR drill + SBOM/SLSA summary.
2. Customer downloads evidence bundle → verifies offline with CLI.
3. In Switchboard, auditor verifies purge manifest + transparency proof.
4. Apply industry compliance pack → baseline report generated.
5. Generate security questionnaire pack with links + verification instructions.

---

## 6) Success Metrics & Verification

- **Trust Center freshness:** Snapshot job runs on schedule with human approval gating; artifacts signed and hash-pinned. _Verify:_ Timestamped snapshot bundle + signature check.
- **Verification UX:** Offline CLI verification completes in <5 minutes on standard bundles; UI drag/drop reports errors clearly. _Verify:_ Time-to-verify tests; failure explanations captured.
- **Compliance packs:** Two packs installed via Switchboard with approvals; baseline evidence bundles emitted. _Verify:_ Receipt log + baseline bundle digests.
- **Procurement velocity:** Security review duration reduced by 30% versus prior pilots. _Verify:_ Internal timestamps (request → approval) dashboards.
- **Integrity:** Each Trust Center claim linked to verifiable artifact/proof. _Verify:_ Link audit passes with no orphan claims.

---

## 7) Team & Ceremony Rhythm

- Capacity: align to standard squad velocity for 2-week sprint.
- Ceremonies (America/Denver):
  - Sprint Planning: Mon Sep 28, 09:30–11:00
  - Stand-up: Daily 09:15–09:30
  - Mid-sprint Refinement: Thu Oct 1, 14:00–14:45
  - Sprint Review: Fri Oct 9, 10:00–11:00
  - Retro: Fri Oct 9, 11:15–12:00

---

## 8) Risks & Mitigations

- **Artifact integrity gaps** → enforce signing + digest pinning; fail closed on missing proofs; runbooks for publish failures.
- **Verification latency >5 minutes** → optimize bundle size, parallel checks, and fast fail messaging.
- **Pack scope creep** → strict starter-scope definition; change control for additional controls.
- **UI clarity** → usability tests on Verify panel; verbose error taxonomy.
- **Approval bottlenecks** → define HIC approvers and escalation path; dry-run mode for snapshot builds.

---

## 9) QA Plan

- **Functional:**
  - Trust Center content model renders all sections with signed artifacts.
  - Snapshot pipeline schedules, signs, and requires approval before publish.
  - CLI commands verify bundles, receipts, and purge manifests with clear reports.
  - Switchboard Verify panel validates signatures/proofs/schema and explains failures.
  - Compliance packs install via Switchboard with approvals and emit baseline bundles.
  - Security questionnaire auto-fill references Trust Center snapshot + verification steps.
- **E2E:** Auditor downloads Trust Center bundle → offline CLI verify <5 minutes → uploads to UI verify panel → applies industry pack → receives baseline evidence bundle → generates questionnaire answer pack.
- **Non-functional:**
  - Verification operations complete within time budget; snapshot jobs stable; signing keys rotated per policy.

---

## 10) Work Breakdown (Backlog Ready)

| ID         | Title                                         | Owner      | Est | Dependencies | Acceptance Criteria (summary)                      |
| ---------- | --------------------------------------------- | ---------- | --: | ------------ | -------------------------------------------------- |
| TRUST-201  | Trust Center content model + signed artifacts | FE+BE      |   5 | —            | Sections live; each entry links to signed artifact |
| TRUST-202  | Snapshot pipeline + approval gate             | Platform   |   5 | TRUST-201    | Scheduled job, signed bundle, approval workflow    |
| TRUST-203  | Tenant-specific Trust Center view             | FE+BE      |   5 | TRUST-201    | Customer-specific posture + evidence exports       |
| VERIFY-211 | CLI verification commands                     | Tooling    |   5 | —            | `bundle`, `receipt`, `purge-manifest` commands     |
| VERIFY-212 | Switchboard Verify panel (drag/drop)          | FE         |   5 | VERIFY-211   | Signature/proof/schema validation + error taxonomy |
| VERIFY-213 | Auditor workspace checklist + report export   | FE+PM      |   3 | VERIFY-212   | Guided checklist + downloadable report             |
| PACK-221   | Healthcare HIPAA starter pack _(option)_      | Compliance |   5 | —            | Mapped controls, policies, evidence hooks          |
| PACK-222   | Finance SOC2+PCI-lite starter pack _(option)_ | Compliance |   5 | —            | Mapped controls, policies, evidence hooks          |
| PACK-223   | Pack installer + baseline report emission     | Platform   |   5 | PACK-221/222 | Approvals, receipts, baseline bundle               |
| PROC-231   | Security questionnaire auto-fill v2           | PM+FE      |   3 | TRUST-202    | Answer pack links to snapshot + verification steps |
| PROC-232   | Evaluation kit v2                             | PM         |   3 | PROC-231     | 30-day plan with cadence, metrics, exit criteria   |

> **Planned:** 49 pts with options to select two packs (PACK-221/222/alt). Adjust estimates if different pack pair chosen.

---

## 11) Dependencies & Assumptions

- Signing infrastructure (keys, cosign/PGP) available with rotation policy.
- Evidence sources expose current digests (SBOM/SLSA/vuln scans/DR drills/SLAs).
- Switchboard supports approvals/receipts; storage for baseline bundles.
- Test vectors for bundles, receipts, purge manifests available for verification.
- ICP selection for two packs finalized before mid-sprint.

---

## 12) Change Management & Rollback

- Trust Center publish requires HIC approval; rollback = revert snapshot to previous signed bundle.
- Verification tools feature-flagged; fallback to manual support runbook.
- Pack installer gated by policy; rollback by uninstall script and removing receipts/bundles.
