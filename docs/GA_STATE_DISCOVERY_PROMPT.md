# Summit GA State Discovery & Readiness Plan Template

This document provides a reusable prompt and execution checklist for an agent with live GitHub and CI access to generate a full GA readiness assessment for the Summit repository. It structures data collection, scoring, and issue synthesis so the outputs are immediately actionable for release planning.

## Usage

1. Launch an execution agent with read access to issues, pull requests, projects, security alerts, workflows, and releases for `BrianCLong/summit`.
2. Provide the prompt in [Next Prompt](#next-prompt) to the agent.
3. Ensure the agent updates tracking artifacts (issues, labels, project cards) only when authorized.

## Next Prompt

```
You are an execution agent with live GitHub API and repository access to https://github.com/BrianCLong/summit.

Mandate: Analyze the *current* repository state and produce a complete GA Readiness Plan with actionable issues and tasks.

### STEP A — STATE DISCOVERY
Fetch authoritative data:
1) All issues (open/closed, labels, milestones)
2) All pull requests (state, checks, approvals, conflicts)
3) Project 19 board cards (all columns)
4) Security tab findings: Dependabot, CodeQL, secret scanning
5) CI status: workflows, test results, failure summaries
6) Code coverage metrics (from CI integrations)
7) Releases/tags and milestone definitions

Summarize metrics:
- Open issues by severity and area
- GA blockers
- CI pass/fail status by workflow
- Security alerts by severity and remediation state
- Top 10 failing tests (with failure messages)

### STEP B — GA READINESS MATRIX
Score each category 0–100 with explicit blockers and GA pass criteria:
- CI Stability
- Test Coverage
- Functional Correctness
- Documentation & Onboarding
- Security Hardening
- Release Artifact Quality
- Performance / Regression Metrics

### STEP C — ACTIONABLE ISSUE SYNTHESIS
For every blocker:
- Create/update GitHub issue titled `[GA][Severity][Area] ...`
- Include summary, reproduction steps (if any), acceptance criteria, required tests, GA impact
- Label: severity:blocker|high|medium|low, area:ci|security|test|docs|core|infra, release:ga
- Add to Project 19 in appropriate column
- Generate subtasks (implementation, tests, docs, validation) with effort (1–3h) and Definition of Done

### STEP D — SECURITY FINDINGS
For each security alert:
- Map to an explicit GitHub issue
- If fixable now: propose minimal patch + regression/verification tests
- If risky: document mitigation and risk justification

### STEP E — CI & TEST STABILIZATION PLAN
For each failing workflow:
- Extract exact errors, identify root cause
- Provide fix plan and proving tests
- If flaky/environmental: propose stabilization steps and deterministic strategies

### STEP F — DOCUMENTATION & RELEASE PLAN
Produce drafts:
- 1-page GA readiness executive summary
- Draft release notes with semantic version bump
- GA milestone definition
- Onboarding/setup docs refresh

### OUTPUT REQUIREMENTS
Deliver:
1) Current State Summary Document (trends, metrics, blockers)
2) GA Readiness Matrix
3) List of Synthesized Issues (table: titles, labels, priority)
4) Top 10 Priority Tasks (with subtasks and owners)
5) Release Plan (steps and GA criteria)
6) Security Coverage Plan (verification steps)
7) CI Healing Roadmap (failure remediation guidance)

### OPERATING CONSTRAINTS
- No issue created/closed without tracking fields
- No TODOs without issues
- No security issue closed without tests
- Output must be actionable and commit-ready
- Provide clear next steps for human/agent execution
```

## Rationale

- Captures all state signals (issues, PRs, CI, security, releases) needed to judge GA readiness.
- Enforces policy-driven issue creation with consistent labels and project tracking.
- Requires evidence-based scoring and remediation plans for CI, tests, security, docs, and releases.
- Delivers ready-to-execute artifacts (issues, subtasks, release plan) instead of narrative-only summaries.
