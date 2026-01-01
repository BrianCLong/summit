# Amendment Process

**Status:** IMMUTABLE
**Authority:** DOCTRINE-ROOT
**Last Verified:** 2025-10-25

## Purpose
To ensure that the Summit Doctrine remains stable while allowing for critical, existential evolution, this document defines the **high-friction process** required to amend any file within `docs/doctrine/`.

---

## 1. The Bar for Amendment

Amendments are only permitted in the following cases:
1.  **Existential Error:** A doctrine is objectively false or actively harmful to the mission.
2.  **Fundamental Shift:** The organization's core mission has formally changed (requires Board/Executive level pivot).
3.  **Legal Necessity:** New regulatory regimes require a change to remain compliant.

**"We want to ship feature X but doctrine Y prevents it" is NEVER a valid reason for amendment.** (See: *Refusal Surface*)

---

## 2. The Process

### Step 1: Proposal (The "Why")
A formal "Doctrine Amendment Proposal" (DAP) must be written.
*   **Must include:** Current text, Proposed text, Reason for change, Risk assessment of the change.
*   **Must be public:** Visible to the entire engineering and product organization.

### Step 2: The Cooling Period
Once proposed, the amendment enters a mandatory **7-day Cooling Period**.
*   No action can be taken.
*   The purpose is to prevent reactive changes based on immediate pressure.

### Step 3: The Council Review
The proposal must be reviewed by the "Doctrine Council" (or equivalent senior technical/product leadership).
*   **Unanimous Consent:** Changes to doctrine require unanimous consent from the designated guardians of the system. Simple majority is insufficient.

### Step 4: Ratification & Traceability
If approved:
1.  The change is committed.
2.  The `Last Verified` date is updated.
3.  A "Ratification Note" is appended to the document history, explaining *exactly* why the change was made.

---

## 3. Immediate Reversion
Any change made to `docs/doctrine/` that bypasses this process is considered an **integrity breach**.
*   **Action:** Immediate revert of the commit.
*   **Consequence:** Incident review of the process failure.

---

## 4. Preservation
The goal of this process is not to prevent all change, but to ensure that **no change happens by accident or exhaustion.**
