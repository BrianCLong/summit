## 📨 High-Priority UI/UX Fix – Slack / Chat Handoff Prompt

Copy–paste this into Slack/Teams/ChatGPT and fill in the brackets. It’s designed to be short enough for chat, detailed enough for a solid fix.

**When to use:** Drop this template into chat threads when you need a fast, review-ready patch for the Graph Explorer overlay regression without drafting a custom ticket from scratch.

---

**ROLE / CONTEXT**

You are a **senior front-end/full-stack engineer with strong UX judgment**.
Tech stack: `React + TypeScript + Vite + Redux Toolkit + Apollo GraphQL + Tailwind/MUI + Jest/RTL`.

Your job: **ship a production-ready fix for this high-priority, client-visible UI/UX issue**, with tests and minimal blast radius.

---

### 1️⃣ Issue Snapshot

* **Title (client-facing):**
  `Predicted link & sentiment overlays reset when navigating back to Graph Explorer`

* **Impact:**

  * Who is affected: `Graph analysts using the Graph Explorer overlay toggles during investigations`
  * Why it matters: `Losing overlay state forces reconfiguration, slowing investigations and eroding trust in the dashboard`
  * Priority & deadline: `P0 – needs to land by current sprint cutoff`

---

### 2️⃣ Current vs Expected Behavior

**Steps to reproduce**

1. `Open Graph Explorer (e.g., /graph/:id) and toggle on “Predicted links” and “Sentiment overlay”.`
2. `Navigate to a different tab/route (e.g., Neighborhood Streaming or IntelGraphCanvas view).`
3. `Return to Graph Explorer.`

**Actual behavior (broken)**

* `Both overlay toggles revert to off; previously fetched predictions/sentiment data are discarded and re-polled.`

**Expected behavior (correct)**

* User POV: `Overlay toggles stay on and previously loaded overlays render immediately when returning to Graph Explorer.`
* States we care about:

  * Loading: `Show existing overlays while background refresh runs; avoid spinner-only blank states.`
  * Empty: `If no predictions/sentiment exist, show lightweight “No overlays available” copy without clearing toggles.`
  * Error / timeout: `Non-blocking inline alert; keep toggle state unchanged.`
* Accessibility expectations: `Toggles must remain keyboard-focusable, preserve focus on return, and announce state via aria-pressed/aria-checked.`

---

### 3️⃣ Context & Code Pointers

* Screen / flow: `Graph Explorer overlays`
* Stack details: `React Router for navigation, Redux Toolkit slice for graph data, Apollo useQuery for overlays`

**Likely relevant files (best guess – you refine):**

* Components:

  * `client/src/components/graph/GraphExplorer.jsx` (overlay toggles, navigation away causes unmount)
  * `client/src/components/graph/PerformanceMode.jsx` (alternate entry that reuses graph state)
* State / hooks:

  * `client/src/store/slices/graphSlice.ts` (graph data and overlay visibility flags)
* API / services (if involved):

  * `client/src/services/socket.ts` and `client/src/components/graph/GraphExplorer.jsx` (Apollo `useQuery` for predictions/sentiment)

If these are wrong, **search the repo** by component names, test IDs, and visible text.

---

### 4️⃣ Non-Negotiables

Your fix must:

1. **Not break existing correct behavior** near this feature.
2. **Respect the design system** (use existing components, tokens, spacing).
3. **Maintain or improve accessibility** (keyboard, focus, ARIA).
4. **Avoid performance regressions** (no heavy compute in render, no extra network spam).
5. **Be clean and reviewable** (good names, typed, no commented-out junk).

---

### 5️⃣ What You Should Do

Please respond in the structure below.

#### A. Understanding & Assumptions

1. Restate the issue in your own words:

   * Who is affected
   * Where it happens
   * What’s broken
   * What “good” looks like

2. List any assumptions you have to make due to missing info.

   * Choose the **least surprising, safest** behavior and state it.

#### B. Root Cause

3. Identify the **exact files/components/hooks/APIs** involved.
4. In 3–5 bullets, explain the root cause:

   * What goes wrong in the logic/state/flow
   * Why it appears under the given STR
   * Any nearby flows that might be touched

#### C. Plan

5. Propose a **small, focused implementation plan** (3–8 bullets) including:

   * State & data flow changes
   * UI / interaction changes
   * Handling of loading/empty/error/slow-network
   * Any minimal refactors to avoid hacks

#### D. Implementation

6. Implement the plan. For each file you touch, provide:

   * File path
   * **Full updated content** in a code block

   Follow existing patterns for components, hooks, and design system usage.

#### E. Tests

7. Using `Jest + React Testing Library`, add or update tests so that:

   * At least **one test reproduces the original bug and now passes**
   * Happy path is covered
   * 1–2 critical edge cases are covered (e.g., no data, error, slow API)

For each test file, include:

* Path
* Short note on what each new/updated test verifies

#### F. Acceptance Check

8. Explicitly confirm:

* [ ] User can `toggle overlays` in `Graph Explorer` and sees `state preserved when returning`.
* [ ] Original defect is covered by at least one automated test.
* [ ] No regressions in `graph overlay toggles, Neighborhood Streaming, IntelGraphCanvas` flows.
* [ ] Accessibility (keyboard, focus, screen reader) is correct or better.
* [ ] No noticeable performance slowdown in the affected view.

Add a one-line explanation for each checkbox.

---

### 6️⃣ Response Format

Reply in this order:

1. Understanding & assumptions
2. Root cause
3. Plan
4. Code changes (by file, full contents)
5. Tests (by file, what they cover)
6. Acceptance checklist with brief notes
7. Risks / follow-ups (if any)

---

That’s the whole handoff. Fill the brackets, paste into your dev assistant / Codex worker, and you’ll get a focused, fix-oriented response.

---

### Optional: Ultra-Maximal Extrapolative Development Prompt

If you need an exhaustive, end-to-end response (architecture, tests, docs, deployment, and PR package) for this same Graph Explorer overlay regression, use the prompt below. It requests a fully built solution, not just guidance.

```
Ultra-Maximal Extrapolative Development Prompt

SYSTEM / PRIME DIRECTIVE
You are an autonomous, high-capability development agent. Your mission is to deliver the most complete, elegant, high-performance, fully realized implementation of the requested project. You must perform maximal extrapolation of all implicit and explicit requirements—beyond the seventh order of implication. For every need, dependency, or future risk, you must foresee it and proactively resolve it with perfect execution.

USER REQUEST
Ship a production-ready fix for the Graph Explorer overlay regression where “Predicted links” and “Sentiment overlay” toggles reset when navigating away and back. Preserve overlay state, avoid unnecessary re-fetches, keep accessibility intact, and follow the acceptance criteria above.

OUTPUT FORMAT REQUIREMENTS (respond in this exact order)
1) High-level summary of your interpretation (explicit + extrapolated requirements)
2) Full proposed architecture
3) Diagrams (text-based)
4) Dependency graph
5) Flow of data / control
6) Complete implementation (source, configs)
7) Complete tests (unit + integration; happy path + regression)
8) Docs (README/ops/deployment as needed)
9) CI/CD and deployment guidance
10) Performance and security analysis (bottlenecks + mitigations)
11) PR package (commit summaries, PR description, reviewer guidance, merge checklist, post-merge notes)
12) Future roadmap (short- and long-term improvements)
13) Optional speculative extensions
```

Use this only when stakeholders explicitly ask for a maximal, everything-included delivery; otherwise prefer the lighter template above to minimize blast radius and review time.
