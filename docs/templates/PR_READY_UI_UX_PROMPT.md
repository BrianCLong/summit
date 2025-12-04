# PR-Ready / GitHub-Style Prompt for High-Priority UI/UX Fixes

Use this prompt when you need a reviewable pull request for a client-visible UI/UX defect. Fill in the bracketed sections before sharing it in a ticket or issue.

---

## 🔁 High-Priority UI/UX Fix – PR-Style Codex Prompt

### Role & Repo Context

You are acting as a **senior engineer preparing a complete PR** for a high-priority, client-visible UI/UX issue in this repo.

* Stack: `[e.g., React 18 + TypeScript + <framework> + <state mgmt> + <design system>]`
* Tests: `[e.g., Jest + React Testing Library + Cypress]`
* Repo conventions:

  * Components live in: `[e.g., src/components/, src/features/]`
  * Hooks / state in: `[e.g., src/hooks/, src/store/]`
  * API layer in: `[e.g., src/api/, src/services/]`

Your output should look like a **reviewable PR**: clear problem statement, design choices, code changes by file, and tests.

---

## 1. Problem Statement (for PR Description)

Fill these in and then treat them as the source of truth:

**Title (client-facing):**
`[e.g., "Fix: Filters reset when switching tabs in Analytics view"]`

**Summary (2–4 sentences):**

* What is broken now: `[...]`
* Who it impacts (roles/clients): `[...]`
* Why it matters (business / trust / workflow): `[...]`

**Steps to reproduce (current behavior):**

1. `[step]`
2. `[step]`
3. `[step]`

**Actual behavior (broken):**

* `[...]`

**Expected behavior (correct):**

* From user POV: `[...]`
* Edge states:

  * Loading: `[...]`
  * Empty: `[...]`
  * Error / timeout: `[...]`

**Priority & timeline:**

* Priority: `P0 / P1`
* Must be in: `[release tag / date]`

---

## 2. Constraints & Guardrails

When designing and implementing the fix, you must:

1. **Preserve existing correct behavior** outside the bug scope.
2. **Respect the design system**

   * Use existing components, variants, spacing, typography, tokens.
   * Do *not* introduce random ad-hoc styles if a pattern exists.
3. **Maintain accessibility**

   * Keyboard navigation, focus order, ARIA roles/labels.
   * Don’t trap focus or hide important info from screen readers.
4. **Avoid performance regressions**

   * No heavy, repeated work in render paths.
   * No new unnecessary network calls or polling.
5. **Keep the code PR-ready**

   * Clear names, good types, no commented-out junk.
   * Small, understandable changes rather than massive refactors.

---

## 3. What You Should Do (Step-by-Step)

### A. Restate & Scope the Issue

1. Restate the issue in your own words:

   * Who is affected (roles or clients)
   * Where it occurs (screen/component/module)
   * Under what conditions
   * What “good” looks like from the user’s perspective

2. Explicitly list any assumptions you have to make based on incomplete info, and choose the **least surprising, safest** behavior.

---

### B. Locate & Explain the Root Cause

3. Identify the exact files and entities involved:

   * Components: `[paths]`
   * Hooks / state / reducers: `[paths]`
   * API calls / services: `[paths]` (if applicable)

4. Provide a short root cause analysis (bullet points):

   * What logic or state handling is incorrect?
   * Why the bug appears under the described STR and not in other cases.
   * Any nearby flows that might be affected by the fix.

---

### C. Propose the Design / Approach

5. Before changing code, propose **a concise design/approach** for the fix:

   Include:

   * State & data flow changes (where state should live, how it persists).
   * UI / interaction changes (what the user will now see/do).
   * Behavior for loading, empty, error, and slow network states.
   * Any minimal refactors needed to avoid hacks or tight coupling.

6. If there are obvious alternatives, briefly mention **1–2 alternative approaches** and why you’re not choosing them (risk, complexity, UX).

---

### D. Implement the Fix (PR Body)

7. Implement the chosen approach. For each file you touch, provide:

   * **File path**
   * **Full, updated content** in a code block

   Follow repo conventions (hooks, naming, design system usage).

8. Make sure the implementation:

   * Handles all relevant states (loading / empty / error / partial data).
   * Provides clear user feedback (no silent failures or “mystery states”).
   * Keeps keyboard and screen-reader flows usable.

9. Do **not** leave commented-out code blocks. If you must deprecate something, remove it and rely on version control for history.

---

### E. Add / Update Tests

10. Using `[e.g., Jest + React Testing Library]`, add or update tests:

For each relevant test file:

* Path: `[e.g., src/features/analytics/__tests__/FiltersPanel.test.tsx]`
* What’s being tested (sentence or two)

You must ensure:

* There is **at least one test that reproduces the original bug and now passes**.
* The main happy path is tested:

  * `[e.g., “user sets filters, navigates away, returns; filters persist”]`
* At least 1–2 key edge cases are tested:

  * `[e.g., no data returned, API error, slow response]`

11. Keep tests readable, descriptive, and aligned with existing test style.

---

### F. Quick Documentation / Notes

12. Add/adjust minimal documentation:

* Inline comments only where logic is not obvious.
* (Optional but nice) A short addition to a feature doc or changelog:

  * What changed
  * Why (link to bug/issue)
  * Any remaining known limitations

---

## 4. Acceptance Criteria (PR Checklist)

This PR is considered complete when:

* [ ] User can `[core action]` in `[screen/flow]` and sees `[expected behavior]` consistently.
* [ ] The original defect is covered by at least one automated test.
* [ ] No regressions in `[named neighboring components/flows]`.
* [ ] Keyboard & screen reader behavior is correct or better than before.
* [ ] No noticeable performance degradation in the affected view.

You must explicitly state, at the end, how your solution satisfies each item above.

---

## 5. Response Format (What I Want Back)

When you respond to this prompt, structure your answer like a PR:

1. **Summary** – Problem & high-level solution (2–5 sentences).
2. **Restated issue & assumptions**
3. **Root cause analysis**
4. **Design / approach**
5. **Code changes (by file, full contents)**
6. **Tests (by file, plus what each test covers)**
7. **How it meets the acceptance criteria (checklist with brief notes)**
8. **Risks / edge cases / follow-ups**

---

Paste the filled-in prompt into your ticket or share with your dev assistant to get a production-ready, reviewable PR for high-priority UI/UX issues.
