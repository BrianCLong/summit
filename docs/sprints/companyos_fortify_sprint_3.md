# Sprint 3: CompanyOS “Fortify” Sprint

**Dates:** Mon **Jan 26, 2026 → Fri Feb 6, 2026**
**Theme:** _“Harden the rails.”_ Reduce blast radius, tighten supply chain, and make governance automatic (not tribal knowledge).

## Sprint Goal

Ship a **production-grade release lane** with **stronger policy enforcement**, **least-privilege deploy identity**, **SBOM/CVE budgets**, and **audit export** that a customer can actually use.

## Success Metrics (Targets)

- **0** deploys without **digest pin + signature verify**
- **100%** services have **data classification + residency tags** enforced by policy
- **CVE budget:** build fails when **critical CVEs > 0** (or exceeds agreed threshold) for release branch
- **Least privilege:** CI deploy role has only required permissions (measured by policy + cloud IAM diff)
- **Audit export:** generate a customer-ready export for 1 release in **< 5 minutes**

---

## Committed Epics

### Epic 1 — Supply Chain Hardening v2

**Outcome:** Artifacts are provably what we built, from what we intended.

**Stories**

- **SCH-1:** Dependency + action pinning enforcement  
  **AC:** CI fails if GitHub Actions not pinned to commit SHA; deps locked; base images pinned by digest.
- **SCH-2:** Provenance verification at deploy time  
  **AC:** deploy job verifies signature + provenance attestation + policy hash match before rollout.
- **SCH-3:** SBOM diff + release note injection  
  **AC:** CI produces SBOM diff between releases and appends summary to release notes.

**Evidence**

- “Supply chain gate” report attached to releases
- One blocked deploy demo (show it failing for the right reason)

---

### Epic 2 — Identity & Least Privilege Deployments v1

**Outcome:** CI can only do exactly what it must—nothing more.

**Stories**

- **IAM-1:** Workload identity for CI (no long-lived keys)  
  **AC:** deploys use OIDC/workload identity; no static secrets required for deploy.
- **IAM-2:** Per-environment roles + separation (staging vs prod)  
  **AC:** prod deploy requires separate role + approval gate; policy verifies env boundaries.
- **IAM-3:** Permission diff + regression test  
  **AC:** IAM policy changes show as a diff artifact; tests ensure “no wildcard permissions.”

**Evidence**

- IAM diff artifact
- Break-glass access review log (even if unused)

---

### Epic 3 — Governance Policies v2 (ABAC + data lifecycle)

**Outcome:** Policy is enforceable, testable, and customer-explainable.

**Stories**

- **POL-1:** ABAC rules: who can deploy what, where  
  **AC:** policy ties actor/team → service/environment; deny-by-default for unknown.
- **POL-2:** Data retention + residency policy hooks  
  **AC:** service must declare retention + residency; deploy denied if missing.
- **POL-3:** Policy decision logging standardization  
  **AC:** every allow/deny produces a consistent audit record with policy bundle hash.

**Evidence**

- Policy test suite with deny cases
- Example “why denied” explanation (developer-friendly)

---

### Epic 4 — Audit Export + Customer Disclosure Pack v2

**Outcome:** Evidence isn’t just collected—it’s consumable.

**Stories**

- **AUDX-1:** Audit export format + CLI  
  **AC:** export supports time range + release SHA; outputs JSONL + summary manifest.
- **AUDX-2:** Disclosure pack “customer mode”  
  **AC:** includes: SBOM, CVE results, signatures, provenance, policy decisions, deploy timeline, retention/residency declarations.
- **AUDX-3:** Redaction rules as code + tests  
  **AC:** redaction unit tests; fails if secrets/known patterns appear in pack.

**Evidence**

- One complete “customer packet” for a real release
- Redaction test report

---

## Sprint Cadence

- **Mon Jan 26:** Kickoff + lock CVE budget rules + environments in scope
- **Wed Jan 28:** Security design review (least privilege + verification flow)
- **Fri Jan 30:** Mid-sprint demo: deploy blocked on missing provenance / unpinned action
- **Tue Feb 3:** Audit export dry-run with a “customer reviewer” role
- **Fri Feb 6:** Evidence review + production lane readiness decision

---

## Risk Register (Explicit)

| Risk                          | Impact | Probability | Mitigation                                                    |
| ----------------------------- | ------ | ----------- | ------------------------------------------------------------- |
| CVE gating may stall releases | High   | Medium      | Start with release branches only; allow dev branches to warn. |
| IAM changes can break deploys | High   | Medium      | Stage with canary env first; keep rollback to prior role.     |
| Policy strictness backlash    | Medium | Medium      | Ensure deny messages are actionable; provide auto-fix docs.   |

---

## Deliverables Checklist (Non-negotiable)

- ADRs: supply chain v2, deploy identity v1, policy v2, audit export v1
- Golden dashboards updated (including “blocked deploys” metric)
- Runbooks: “verification failed”, “policy denied”, “rollback”, “break-glass”
- One “customer-ready” evidence bundle attached to a tagged release

---

## Notes

- If someone says **“next”** again, the next sprint focuses on **performance/cost model + multi-tenant white-label packaging + region controls** (turning CompanyOS into something we can sell with confidence).
