---
id: ui-ux-fix
name: UI/UX Fix Template
version: 1.0.0
category: core
type: ui-ux-fix
description: High-priority client-visible UI/UX issue fix with comprehensive testing and documentation
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - ui
  - ux
  - frontend
  - bug-fix
  - client-facing
metadata:
  priority: P1
  estimatedTokens: 2000
  complexity: moderate
variables:
  - name: title
    type: string
    description: Client-facing issue title
    required: true
    prompt: "What is the issue title?"
  - name: impactWho
    type: string
    description: Who is affected by this issue
    required: true
    prompt: "Who is affected? (e.g., 'All analysts', 'Premium users')"
  - name: impactWhy
    type: string
    description: Why this matters
    required: true
    prompt: "Why does this matter? (e.g., 'Blocks critical workflow')"
  - name: priority
    type: string
    description: Issue priority
    default: P1
    validation:
      enum: [P0, P1, P2, P3, P4]
    prompt: "Priority (P0/P1/P2/P3/P4)?"
  - name: targetRelease
    type: string
    description: Target release date or version
    required: true
    prompt: "Target release? (e.g., '2025-12-01' or 'v1.5.0')"
  - name: stepsToReproduce
    type: multiline
    description: Steps to reproduce the issue
    required: true
    prompt: "Steps to reproduce (one per line)?"
  - name: actualBehavior
    type: string
    description: What actually happens
    required: true
    prompt: "What actually happens?"
  - name: expectedBehavior
    type: string
    description: What should happen
    required: true
    prompt: "What should happen?"
  - name: edgeCases
    type: string
    description: Edge cases to consider
    default: "loading states, empty states, error states, slow network"
    prompt: "Edge cases to consider?"
  - name: accessibilityNotes
    type: string
    description: Accessibility considerations
    default: "keyboard navigation, focus management, screen reader support"
    prompt: "Accessibility notes?"
  - name: screenArea
    type: string
    description: Screen or area where the issue occurs
    required: true
    prompt: "Screen/area? (e.g., 'Analytics > Timeline')"
  - name: likelyComponents
    type: string
    description: Likely relevant components/files
    default: "TBD - assistant should locate"
    prompt: "Likely components/files (or 'TBD')?"
  - name: stack
    type: string
    description: Technology stack
    default: "React + TypeScript + Apollo + MUI"
    prompt: "Stack? (e.g., 'React + TypeScript + Apollo + MUI')"
  - name: testFramework
    type: string
    description: Testing framework
    default: "Jest + React Testing Library"
    prompt: "Test framework? (e.g., 'Jest + React Testing Library')"
  - name: complexity
    type: string
    description: Desired complexity level
    default: moderate
    validation:
      enum: [minimal, moderate, maximal]
    prompt: "Complexity (minimal/moderate/maximal)?"
---
# 🛠 High-Priority UI/UX Fix — AI Assistant Prompt

## Role

You are a senior front-end / full-stack engineer with strong UX judgment, working in:
**{{stack}}**

Your task: **design and implement a safe, production-quality fix for this high-priority, client-visible UI/UX issue**, including tests.

---

## 1. Issue Snapshot

* **Title (client-facing):**
  `{{title}}`

* **Impact:**
  * Who it affects: {{impactWho}}
  * Why it matters: {{impactWhy}}
  * Priority: {{priority}}
  * Target release: {{targetRelease}}

---

## 2. Behavior

**Steps to reproduce**

{{stepsToReproduce}}

**Actual behavior**

* {{actualBehavior}}

**Expected behavior**

* From user's POV: {{expectedBehavior}}
* Edge cases / states: {{edgeCases}}
* Accessibility notes: {{accessibilityNotes}}

---

## 3. Context

* Screen / area: `{{screenArea}}`
* Likely relevant code (best guess):
  * {{likelyComponents}}

If any of the above is wrong, locate the correct files by searching for component names, testIDs, or visible strings.

---

## 4. Hard Requirements

When you fix this, you must:

1. **Preserve existing correct behavior** outside this bug
2. **Follow design system** components & patterns (no ad-hoc one-offs if avoidable)
3. **Maintain accessibility** (keyboard, focus, ARIA where needed)
4. **Avoid performance regressions** (no heavy logic in render, no extra network calls)
5. **Produce clean, typed, maintainable code** (no commented-out junk)
6. **Follow CLAUDE.md conventions** from this codebase
7. **Ensure tests pass**: Run `pnpm test` and `make smoke` before submitting

---

## 5. What You Should Do

### 1. Restate the issue & assumptions

* Briefly restate who is affected, where, what's broken, and what "good" looks like
* List any assumptions you make; choose the safest, least surprising behavior

### 2. Find root cause

* Identify the exact files/components/hooks/APIs involved
* Explain in 3–4 bullets what's causing the bug / bad UX

### 3. Plan the fix

* Write a 3–6 bullet plan covering:
  * State/data flow changes
  * UI/interaction changes
  * Handling of loading/empty/error
  * Any small refactors needed to avoid hacks

### 4. Implement

* Apply the plan. For each file, output the **full updated content**
* Ensure predictable behavior for normal, slow, and error conditions
* Use the Edit tool to make changes to existing files
* Follow existing code patterns and conventions from the codebase

### 5. Test

* Add/update tests using {{testFramework}} so that:
  * At least one test reproduces the original issue and now passes
  * Main happy path and 1–2 key edge cases are covered
* Run `pnpm test` to verify tests pass
* Run `make smoke` to verify golden path

### 6. Document briefly

* Add a short comment or markdown note summarizing what changed and why, plus any non-obvious edge cases

---

## 6. Acceptance Criteria

This is done when:

* [ ] User can perform the core action in {{screenArea}} and sees correct behavior
* [ ] Original defect is covered by at least one automated test
* [ ] No regressions in nearby components/flows
* [ ] Keyboard & screen reader behavior is correct or better
* [ ] No noticeable performance slowdown in the affected view
* [ ] Code follows CLAUDE.md conventions (imports, formatting, testing)
* [ ] All tests pass (`pnpm test`)
* [ ] Golden path smoke test passes (`make smoke`)

---

## 7. Output Format

Structure your response as:

1. **Restated issue & assumptions**
2. **Root cause** (3-4 bullets)
3. **Plan** (3-6 bullets)
4. **Code changes** (by file, using Edit tool)
5. **Tests** (by file, what they cover)
6. **Acceptance criteria checklist** with brief confirmations
7. **Risks / follow-ups** (if any)

---

{{#if (eq complexity "maximal")}}
## 8. Maximal Extrapolation Mode

Since complexity is set to **maximal**, additionally provide:

* **Performance analysis**: Identify potential bottlenecks and optimizations
* **Security review**: Check for XSS, injection, or other vulnerabilities
* **Accessibility audit**: WCAG 2.1 AA compliance verification
* **Future-proofing**: Suggest how this component could evolve
* **Metrics**: Suggest what to track (errors, usage, performance)
* **Observability**: Add logging/tracing where appropriate
* **Documentation**: Update component documentation and storybook examples
* **Migration notes**: If this affects other components, provide guidance
{{/if}}

---

**Remember**: The golden path is sacred. Keep it green! 🟢
