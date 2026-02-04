Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Change Classes

To ensure sustained velocity without governance erosion, all changes in the Summit repository are classified into three strict categories. This classification determines the required CI checks, review depth, and velocity lane.

## 1. Patch (Fast Lane)

**Definition:**
No behavior change. No API change. Safe to merge with minimal friction.

**Examples:**

- Documentation updates (`docs/`)
- Refactoring internal logic (no signature changes)
- Fixing typos
- Adding tests
- Chore updates (dependencies, CI config)

**Requirements:**

- **Lane:** Fast Lane
- **CI:** Standard lint/test suite.
- **Review:** 1 approval (can be from code owner).
- **Evidence:** None required (unless specifically related to compliance).

## 2. Minor (Standard Lane)

**Definition:**
Backward-compatible behavior or API changes. New features that do not break existing consumers.

**Examples:**

- Adding a new API endpoint
- Adding a new optional field to a schema
- Implementing a new feature flagged feature
- UI enhancements

**Requirements:**

- **Lane:** Standard Lane
- **CI:** Full integration suite + Regression tests.
- **Review:** 1 approval from Code Owner + 1 approval from Domain DRI.
- **Evidence:** Updated changelog, feature evidence bundle.

## 3. Breaking (Guarded Lane)

**Definition:**
Incompatible changes. Any change that requires consumers to update their code or behavior.

**Examples:**

- Removing or renaming an API endpoint
- Changing a mandatory field in a schema
- Altering core governance policies
- Major dependency upgrades that break APIs

**Requirements:**

- **Lane:** Guarded Lane
- **CI:** Full suite + Smoke tests + Migration tests.
- **Review:** 2 approvals (Code Owner + Governance Lead).
- **Evidence:** Migration guide, full compliance audit.
