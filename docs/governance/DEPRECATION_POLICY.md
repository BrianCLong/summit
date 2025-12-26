# Deprecation, Migration, & Sunset Strategy

**Status:** APPROVED
**Last Updated:** October 2025
**Effective Date:** Immediate

---

## Overview

Software evolves. Features become obsolete. APIs change. This policy ensures that Summit handles these transitions **gracefully**, respecting the investments our users and partners have made.

We do not "pull the rug." We provide clear signals, ample time, and helpful tooling.

**Reference:** For technical implementation details of API versioning, see `docs/API_VERSIONING_DEPRECATION_STRATEGY.md`.

---

## 1. The Deprecation Lifecycle

Every feature, API version, or major capability moves through four states:

1.  **Experimental / Beta:** (Optional) Use at your own risk. May change without notice.
2.  **Stable / GA:** Fully supported. Covered by SLOs. Breaking changes require versioning.
3.  **Deprecated:** Still works, but marked for removal. No new development. Warnings issued.
4.  **End-of-Life (EOL):** Removed. Returns 410 Gone or equivalent error.

---

## 2. Notice Periods (SLA)

We commit to the following minimum notice periods before breaking changes or removals:

| Scope | Minimum Notice | Communication Channel |
| :--- | :--- | :--- |
| **Public API (Major)** | 12 Months | Email, Blog, API Response Headers |
| **Public API (Minor)** | 6 Months | Email, Changelog |
| **Internal API / SDK** | 3 Months | Dev Newsletter, Deprecation Warnings |
| **UI Feature** | 3 Months | In-App Banner |
| **Security Critical** | Immediate | Emergency Notification |

*Note: "Security Critical" refers to features found to have unpatchable vulnerabilities.*

---

## 3. Migration Policy

For every deprecated feature, we must provide a **Migration Path**.

### 3.1 The "Bridge" Requirement
We will not deprecate X until Y is ready and proven.
*   **Rule:** The replacement feature must be at "Stable / GA" status for at least 1 month before the old feature enters "Deprecated" status.

### 3.2 Tooling & Support
For major transitions (e.g., API v1 -> v2), we will provide:
*   **Migration Guides:** Step-by-step documentation.
*   **Codemods / Scripts:** Automated tools to update client code (where feasible).
*   **Parallel Run:** Ability to run both versions simultaneously during the transition window.

---

## 4. Sunset (EOL) Execution

When the clock runs out:

1.  **The "Brownout" (Optional):** For APIs, we may schedule short, intentional outages (e.g., 1 hour) in the weeks leading up to EOL to scream-test dependent systems.
2.  **The Cutover:** The feature is disabled.
3.  **The Archive:** Code is removed from the codebase, but data is often archived or migrated, not just deleted (unless requested).
4.  **The Tombstone:** URLs/APIs return a helpful error message pointing to the migration guide, not a generic 404.

---

## 5. Audit & Governance

*   **Registry:** All deprecated items are tracked in the `DEPRECATION_REGISTRY.md` (to be created if needed, or tracked in JIRA/Linear).
*   **Review:** The Architecture Review Board reviews the "Deprecation Watchlist" quarterly.
*   **Invariants:** We cannot deprecate a feature if it violates a **Platform Invariant** (e.g., we cannot remove "Audit Logs" just because they are hard to maintain).

---

## 6. Exceptions

Exceptions to this policy (e.g., faster removal) require **CTO Approval** and must be justified by:
*   Critical Security Vulnerability.
*   Legal / Compliance Requirement.
*   Existential threat to platform stability.
