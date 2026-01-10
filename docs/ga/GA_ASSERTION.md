# MVP-4 GA Issuance: Stop-the-World Assertion

**Effective Date:** October 31, 2025
**Authority:** Jules, MVP-4 GA Issuance Captain
**Scope:** Entire `summit` repository and all build artifacts

---

## 1. GA Declaration

**MVP-4 Summit is hereby declared GA (General Availability).**

This declaration asserts that the platform has transitioned from "technically defensible" to **"issuance-complete, locked, and announcement-ready."**

### 1.1 What GA Means
- **Production Readiness:** The core Tier-0 journeys (Auth, Ingestion, Investigation, AI Analysis, Governance) are validated for enterprise production use.
- **Support Commitment:** We are now operationally committed to the SLOs defined in `docs/SLOs.md` and the support tiers in `docs/SUPPORT_PLAN.md`.
- **API Stability:** All public APIs (`v1` REST, `v2` GraphQL) are now subject to the 6-month deprecation policy defined in `docs/API_VERSIONING_STRATEGY.md`.
- **Security Hardening:** The security posture defined in `docs/SECURITY_THREAT_MODEL.md` is active and enforced.

### 1.2 What is Out-of-Scope (Deferred)
The following are explicitly **deferred** to post-GA and are NOT covered by this declaration:
- **PsyOps / Information Warfare Modules:** All services in the `Reserved Service Namespace` (see `docs/governance/SERVICE_INVENTORY.md`).
- **Advanced Graph Analytics (Real-time Community Detection):** Deferred to v2.1.
- **Bi-directional MISP Sync:** Deferred to v2.1.
- **FedRAMP Certification:** Alignment only; certification is a future milestone.

---

## 2. Lock Protocols

To preserve the integrity of this GA issuance, the following locks are active:

### 2.1 Branch Protection
- **Branch:** `main`
- **Lock Level:** **Strict**. No direct commits. All PRs require:
  - CI Green Signal (Build, Test, Lint, Security Scan)
  - 1 Approval from Code Owner
  - No "WIP" or "Draft" status

### 2.2 Release Script Safeguards
- Release scripts (`scripts/release/`) must verify the presence of `GA_LOCKED=true` or similar environment constraints before publishing artifacts.
- Releases cannot be cut from dirty working directories.

### 2.3 Evidence Integrity
- All compliance artifacts (SBOMs, Attestations, Test Results) generated for this release are considered **Immutable**.
- Any modification to evidence invalidates the GA issuance.

---

## 3. Invalidation Conditions

This GA status is **VOID** if:
1.  **Critical Security Vulnerability:** A CVE with CVSS > 9.0 is discovered in core components without a patch.
2.  **Data Loss Event:** A migration script is found to be destructive in production scenarios.
3.  **Governance Bypass:** A method is discovered to bypass OPA policy enforcement in the API Gateway.

---

## 4. Handoff

I, Jules, MVP-4 GA Issuance Captain, hereby certify that:
- [x] All "TBD" items in GA documentation have been resolved or waived.
- [x] Service inventory accurately reflects the shipping state.
- [x] Reviews (Legal, Marketing, Security) are verified.
- [x] Lock protocols are documented.

**Verdict:** **MVP-4 GA is ISSUABLE.**

**Next Steps:**
1.  **Codex:** Generate Release Notes & Evidence Index.
2.  **Claude:** Finalize Board & Investor Narrative.
3.  **Antigravity:** Begin Post-GA Stabilization Sprint.

---
*Signed,*
*Jules*
