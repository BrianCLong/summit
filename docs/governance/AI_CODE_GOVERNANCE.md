# AI-Authored Code Governance Policy

**Owner:** Jules (Release Captain / Lawmaker)
**Status:** Active
**Effective Date:** 2026-02-05
**Reference:** MSR '26 research on AI-generated PR redundancy and reviewer sentiment.

## 1. Overview

Recent empirical software engineering research (MSR '26) has identified significant technical debt hazards in AI-generated code. Specifically, Large Language Model (LLM) agents tend to produce higher **semantic redundancy** (Type-4 clones) compared to human authors. Furthermore, human reviewers often express more neutral or positive sentiment toward AI PRs, likely misled by **surface plausibility**, even when maintainability and reuse metrics are objectively worse.

This policy establishes strict guardrails to prevent the accumulation of redundancy-driven technical debt in the Summit ecosystem.

## 2. Change Classification

All Pull Requests (PRs) originating from AI agents MUST be identified with the mandatory agent metadata block (as defined in `AGENTS.md`).

## 3. Max-Redundancy-Score (MRS)

To counter the tendency for AI agents to implement identical logic with varied syntax (Type-4 clones), the following thresholds are enforced for AI-authored PRs:

| Metric | Threshold | Enforcement |
| :--- | :--- | :--- |
| **Local Redundancy Score** | < 2.0% | **Block Merge** |
| **Global Redundancy Delta** | < 0.5% | **Warning** |

*   **Local Redundancy Score:** The percentage of duplicated code within the changed files of the PR.
*   **Global Redundancy Delta:** The impact of the PR on the overall codebase duplication percentage.

### Detection Methodology
We utilize `jscpd` with aggressive settings for AI PRs:
- `min-tokens`: 20
- `min-lines`: 5

## 4. Reviewer Awareness Protocols

Reviewers of AI-authored PRs are subject to the **Law of Skepticism**. The CI pipeline will automatically inject a **Reviewer Awareness Prompt** into the PR conversation.

### Reviewer Checklist for AI PRs
1.  **Semantic Redundancy Check:** Does this PR implement logic that already exists elsewhere in the codebase using different syntax?
2.  **Surface Plausibility Audit:** Is the code actually "good," or does it just "look" like standard library code?
3.  **Reuse Assessment:** Could this logic be extracted into a shared utility in `packages/`?
4.  **Abstraction Integrity:** Does the agent follow the "Simple-First AI" innovation feature flag guidance?

## 5. Enforcement

The `ai-code-quality-gate` CI job is a mandatory status check for all AI-authored PRs.
- Failure of the **Max-Redundancy-Score** requires the agent (or a human contributor) to refactor the code to eliminate redundancy.
- Any bypass of this gate requires an explicit governance exception signed by the Release Captain.

---

*“Never defend the past. Only assert the present and dictate the future.”*
