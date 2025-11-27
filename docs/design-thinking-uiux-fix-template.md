# Design-Thinking P0/P1 UI/UX Fix – Dev Assistant Prompt

Use this template to drive a compact Empathize → Define → Ideate → Prototype → Test loop for urgent UI/UX fixes. Fill the brackets with project specifics and hand it to your dev assistant or team.

---

## 1. Empathize – who’s hurting and how

**Issue title (user/client framing):** `[e.g., “Analysts lose their filter setup whenever they pivot between views.”]`

**User + context**

- Primary user(s): `[e.g., Investigators, Ops leads, Intel analysts]`
- Where this happens: `[screen/module/flow; e.g., Investigations > Case Workspace > Timeline tab]`
- Typical situation: `[…short narrative: “Analyst under time pressure is pivoting across entities and needs stable filters…”]`

**Pain & consequences**

- Immediate pain: `[…]`
- Downstream impact (business/trust/error risk): `[…]`
- Priority: `P0 / P1`
- Target release: `[version/date]`

---

## 2. Define – problem statement

**Point of view (POV) statement**

> `[User type]` needs a way to `[need]` because `[insight about why the current behavior breaks their workflow or mental model].`

**Current behavior (facts)**

- Steps to reproduce:
  1. `[step]`
  2. `[step]`
  3. `[step]`
- Actual result: `[…]`

**Desired behavior (facts + UX intent)**

- Expected result (user’s POV): `[…]`
- UX intent (how it should feel): `[e.g., “Feels stable, predictable; no surprises; doesn’t erase my context”]`
- States that must be handled: `[loading / empty / partial / error / slow network]`
- Accessibility goals: `[keyboard-first, focus order, ARIA, screen reader cues, motion sensitivity, etc.]`

---

## 3. Ideate – options (pick the best one)

**Context & constraints**

- Relevant app area: `[e.g., analytics workspace sidebar]`
- Tech stack notes: `[routing model, state library, major patterns]`
- Likely relevant code:
  - Components: `[src/components/..., src/features/.../...]`
  - Hooks/state: `[src/hooks/useX.ts, src/store/xSlice.ts]`
  - API layer: `[src/api/x.ts, src/services/xService.ts]`

**Non‑negotiable constraints**

1. Don’t break existing correct behavior outside this bug.
2. Follow the design system (components, tokens, spacing, typography).
3. Maintain accessibility and keyboard navigation.
4. Avoid performance regressions (no heavy logic in render, no redundant network calls).
5. Keep the fix understandable and maintainable (no giant hacks, no opaque side effects).

**Generate 2–3 approaches, then choose one**

For each option:

- Short name: `[e.g., “Persist filters in URL query”]`
- Approach summary: `2–3 bullets`
- Pros: `2–3 bullets`
- Cons/risks: `2–3 bullets`

Then select the preferred approach and explain why it is best (least surprising, lowest risk, matches the POV).

---

## 4. Prototype – implementation plan & code

Treat the solution as production-quality but lightweight.

### A. Plan

- Data & state changes (where state lives and how it flows).
- UI changes (component structure, props, layout).
- Interaction details (click/change/navigation/retry behavior).
- Handling of all states (loading, empty, error, partial data).
- Backwards compatibility and impact on neighboring flows.
- Small refactors needed to avoid brittle hacks.

### B. Implement

- Implement the plan using idiomatic patterns for your stack (`React/TypeScript/<framework>/<state mgmt>/<design system>`).
- Keep components focused; name things clearly.
- Handle edge cases explicitly with guard clauses.
- Manage focus and keyboard navigation after key actions.
- Avoid flicker or jank (preserve state across transitions).
- Provide clear, user‑appropriate error messages.
- No commented‑out dead code in the final version.

Provide the **full updated file** for every touched file in your response.

---

## 5. Test – verification, UX & regression guardrails

### A. Automated tests

Use your test stack (e.g., Jest + React Testing Library). Add or update tests so that:

- At least one test reproduces the original issue and now passes.
- The main happy path is covered (e.g., user applies filter, navigates, returns, filter persists).
- Key edge cases are covered (no data, slow API, error, feature flag off/on).

For each test file, note its path and briefly describe what the test covers.

### B. UX sanity checklist

- Behavior matches the POV statement (user + need + insight).
- Mental model is consistent (no surprise resets or hidden side effects).
- Keyboard navigation is predictable and usable.
- Error/empty states explain what’s happening in user‑friendly language.

---

## 6. Acceptance criteria (design-thinking aligned)

- **Empathize / Define**: Solution clearly serves the identified user and need from the POV statement.
- **Ideate / Prototype**: Chosen approach is explained and justified versus at least one alternative; code implements it cleanly.
- **Test**: Issue is covered by passing automated tests; main happy path and edge cases are tested; no regressions in neighboring flows; accessibility and performance are preserved or improved.

---

## 7. Response format

Respond with the sections below, in order:

1. **Empathize & Define**
   - User story & POV statement
   - Current vs desired behavior
2. **Ideation**
   - 2–3 options, pros/cons
   - Chosen solution + justification
3. **Prototype (Implementation)**
   - Plan (bullets)
   - Code changes (by file, full contents)
4. **Test**
   - Automated tests (by file, what they cover)
   - UX sanity notes
5. **Acceptance Criteria**
   - Checklist items with a brief line on how each is satisfied
6. **Risks & Follow‑Ups**
   - Remaining questions or recommended refinements

---

_If you want, you can take a real bug and pre‑fill this template so the team can paste it into your dev assistant._
