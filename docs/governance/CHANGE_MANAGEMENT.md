# Evolution Governance Process

**Status:** APPROVED
**Last Updated:** October 2025
**Effective Date:** Immediate

---

## Overview

This document defines how Summit evolves. It establishes the process for proposing, reviewing, and approving new capabilities, ensuring that innovation does not come at the cost of stability, security, or core invariants.

**"Move fast and break things" is explicitly rejected.**
**"Move deliberately and fix things" is the mandate.**

---

## 1. Change Classification

All proposed changes fall into one of three categories:

### Type A: Routine Evolution
*   **Definition:** Bug fixes, minor UI improvements, performance optimizations, new connectors using existing patterns.
*   **Process:** Standard PR review (1-2 reviewers).
*   **Approval:** Team Lead / Peer.

### Type B: Architectural Extension
*   **Definition:** New API endpoints, schema changes, new minor services, significant UI workflows.
*   **Process:** RFC (Request for Comments) required.
*   **Approval:** Architecture Review Board (ARB) or Principal Engineer.

### Type C: Platform Mutation (Major)
*   **Definition:** Changes to Invariants, new persistence layers, new authentication flows, autonomy level changes.
*   **Process:** Full "constitution-level" review. Formal Design Doc. Threat Model update.
*   **Approval:** CTO / Head of Engineering + Security Lead + Product Lead.

---

## 2. The RFC Process (Type B & C)

### 2.1 Proposal
Create a new RFC document in `docs/rfcs/` using the standard template. It must address:
*   **Problem:** What are we solving?
*   **Proposed Solution:** Technical design.
*   **Invariants Check:** Explicit statement of how this respects `docs/governance/PLATFORM_INVARIANTS.md`.
*   **Evolution Stream:** Which stream (`docs/roadmap/CAPABILITY_STREAMS.md`) does this advance?
*   **Risk:** What could go wrong?
*   **Alternatives:** What else did you consider?

### 2.2 Review Phase
*   **Timeline:** Minimum 3 days for comments (Type B), 1 week (Type C).
*   **Required Reviewers:**
    *   **Security:** For auth/data changes.
    *   **Ops:** For infrastructure/scale changes.
    *   **Product:** For feature/workflow changes.

### 2.3 Decision
*   **Approved:** Proceed to implementation.
*   **Changes Requested:** Revise and re-submit.
*   **Rejected:** Idea is killed (see Kill Criteria).

---

## 3. Kill Criteria

An idea or PR will be **immediately rejected** if it:
1.  Violates a **Platform Invariant** without a corresponding Constitutional Amendment.
2.  Introduces a new persistence layer without justification (we stick to Postgres/Neo4j/Redis/S3).
3.  Bypasses the Policy Engine (OPA) for "convenience".
4.  Lacks an audit trail design.
5.  Is "solution looking for a problem" (not mapped to a Capability Stream).

---

## 4. Implementation Governance

### 4.1 Feature Flags
*   New major features must be wrapped in Feature Flags.
*   Default state: `OFF`.

### 4.2 "The 3-Point Landing"
Every major feature must land with:
1.  **Code:** High-quality, tested implementation.
2.  **Docs:** Updated user guides and architecture docs.
3.  **Telemetry:** Dashboards showing usage and health.

---

## 5. Post-Implementation Review

For Type C changes, a "Post-Launch Review" occurs 1 month after release to verify:
*   Did it deliver the expected value?
*   Did it introduce unexpected instability?
*   Should we keep it, iterate, or rollback?

---

## 6. Emergency Override

In the event of a critical incident (Sev1/Sev0), the standard process can be bypassed by the **Incident Commander**.
*   **Requirement:** A "Retroactive RFC" must be filed within 3 business days to document the change and bring it back into compliance.
