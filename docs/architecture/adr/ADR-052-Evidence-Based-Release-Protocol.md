# ADR-052: Evidence-Based Release Protocol (EBRP)

**Date:** 2024-02-28
**Status:** Accepted
**Area:** Infrastructure / CI
**Owner:** Platform Engineering
**Tags:** release, ci, governance, compliance

## Context

During the final push for Summit GA release, GitHub Actions experienced a severe, systemic outage (1,000+ workflow queue, >3 hour delays). This caused the primary branch protection check (`golden-main`) to hang, blocking the automated release pipeline despite all code changes and configurations being functionally correct.

This highlighted a fundamental flaw in traditional release governance: **treating third-party operational tooling as an authoritative gate rather than a signal generator.**

If a vendor's infrastructure outage can indefinitely halt our release authority when our software is demonstrably ready, we lack mature operational independence.

## Decision

We are implementing an **Evidence-Based Release Protocol (EBRP)** as an emergency release track. This mechanism allows a release to proceed even when the primary CI/CD tooling is saturated or down, provided a verifiable cryptographically-backed "evidence package" is constructed and approved by leadership.

### Core Decision

We will treat CI/CD systems (like GitHub Actions `golden-main` check) as *high-confidence signals*, but **not absolute blockers** if alternative evidence proves release readiness. In the event of tooling saturation, an engineer can manually compile release evidence, seek executive approval, and execute the release using the emergency protocol.

### Key Components

- **Evidence Bundle (`ga-readiness-evidence.md` / `evidence.json`)**: A comprehensive record containing PR SHAs, remediation details, risk assessments, and vendor status page references.
- **Out-of-Band Approval**: Direct approval from Platform Engineering Leadership or the CTO based on the evidence bundle, bypassing the stuck CI gate.
- **Rollback Readiness**: Strict prerequisite for EBRP; rollback instructions and canary deployments must be explicitly defined in the evidence package.

### Implementation Details

The EBRP is triggered when CI queue times exceed 60 minutes. An engineer generates the `evidence.json` manually or via script, attaches it to the release payload, documents the vendor outage, and requests out-of-band approval to push directly to production (bypassing the specific GitHub status check temporarily for the admin override).

## Alternatives Considered

### Alternative 1: Wait for Vendor Tooling Recovery

- **Description:** Pause the release until GitHub Actions recovers and processes the queue.
- **Pros:** Adheres to standard path; no process deviation required.
- **Cons:** Unpredictable timeline; massive opportunity cost; violates the principle of operational independence.
- **Cost/Complexity:** Low complexity, high business cost.

### Alternative 2: Disable Branch Protection Globally

- **Description:** Turn off branch protection rules entirely and push to main.
- **Pros:** Immediate unblocking.
- **Cons:** Highly destructive to compliance; destroys audit trails; introduces massive risk for simultaneous unauthorized pushes.
- **Cost/Complexity:** High risk, low effort.

## Consequences

### Positive

- **Operational Independence:** We retain control over our release schedule despite vendor outages.
- **Enhanced Governance:** The EBRP establishes a higher-tier "audit-grade" decision framework that looks beyond binary CI checks.
- **Business Agility:** Ability to ship critical updates (or GA releases) without being held hostage by third-party status pages.

### Negative

- **Process Overhead:** Requires manual compilation of evidence packages when invoked.
- **Approval Bottleneck:** Requires senior leadership availability for out-of-band approval.

### Neutral

- Modifies our definition of "required status checks" to include an emergency override clause.

### Operational Impact

- Requires robust monitoring and immediate rollback capabilities to mitigate the slightly elevated risk of bypassing automated gates.

## Code References

### Core Implementation

- `scripts/release/generate_evidence_bundle.mjs` - Evidence generation script
- `.github/workflows/ci.yml` - Relevant CI pipelines that may be bypassed under EBRP.

## Tests & Validation

### CI Enforcement

- The existence of the EBRP means CI enforcement can be administratively overridden *only* if the evidence package is attached to the release documentation.

## Related ADRs

- ADR-005: CI/CD Consolidation

---

## Revision History

| Date       | Author | Change          |
| ---------- | ------ | --------------- |
| 2024-02-28 | Jules  | Initial version |
