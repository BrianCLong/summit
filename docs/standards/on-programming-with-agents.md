# Standard: On Programming with Agents

**Status:** Draft
**Owner:** Agentic Governance
**Based on:** [Zed: On Programming with Agents](https://zed.dev/blog/on-programming-with-agents)

## 1. Core Principles

To maintain code quality and security while leveraging agentic workflows, Summit adopts the following three operational rules. These are not just guidelines but machine-enforced policies.

### Rule 1: Plan First
**"LLMs automate typing, not thinking."**
*   **Requirement:** Every PR significantly authored by an agent MUST include a `PLAN.md` file (or a `PLAN` section in the PR description if small).
*   **Enforcement:** `Agentic Plan Gate` (CI).
*   **Content:** The plan must explicitly state:
    *   **Goal:** What is being achieved?
    *   **Constraints:** What must NOT be broken?
    *   **Files:** Which files are expected to change?
    *   **Verification:** How will we know it worked?

### Rule 2: Stay in the Loop
**"Only use agents for tasks you already know how to do."**
*   **Requirement:** Humans must verify agent output incrementally.
*   **Constraints:**
    *   No "fire and forget" executions.
    *   PRs must not contain `TODO` markers left by agents (e.g., `// TODO: implement this`).
    *   Large PRs (>20 files) authored by agents require `PLAN.md` justification.

### Rule 3: Review Aggressively
**"Review, review, review."**
*   **Requirement:** Treat agent-generated code as a PR from an unknown external contributor.
*   **Process:**
    *   Do not skim.
    *   Verify logic, not just syntax.
    *   Look for "hallucinated" APIs or subtle regressions.

## 2. The `PLAN.md` Contract

For complex agentic tasks, a `PLAN.md` file should be created in the root or the working directory.

```markdown
# Agent Plan

## Goal
(Describe the intent)

## Constraints
- Must not break existing auth tests
- Must use existing 'SharedLogger' class

## Proposed Changes
- modify server/src/api.ts
- create server/src/new_feature.ts

## Verification
- Run 'npm test:unit'
- Manual check of /health endpoint
```

## 3. Enforcement

The **Agentic Plan Gate** runs in CI to enforce these rules.
*   **Mode:** `warn` (default) or `strict`.
*   **Failure:** Missing plan, left-over TODOs, or drift from constraints.
