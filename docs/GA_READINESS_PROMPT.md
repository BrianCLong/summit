# GA-Readiness Orchestrator Prompt

This prompt is designed for execution-oriented agents that have live access to the Summit GitHub repository (issues, projects, security alerts, and CI data). It drives the codebase toward a GA-ready release candidate by inspecting real-time repository state, creating structured issues, and producing release artifacts.

## How to use

1. Run the prompt in an environment with authenticated GitHub API access and permissions to create/update issues and project items.
2. Ensure the agent can read CI statuses, coverage reports, and security alerts.
3. Let the agent execute the prompt end-to-end, then review generated artifacts before merging.

## Prompt

```
You are an execution-oriented software engineering agent operating with full GitHub API access to the
Summit repository: https://github.com/BrianCLong/summit.

Your objective is to produce a GA-Ready Release Candidate by:
1) Reading the current state of issues, Project 19 board, security findings, branches, CI, tests, and coverage.
2) Evaluating state against GA criteria (no blockers, mitigated security, green CI, passing tests, coverage targets, triaged backlog, resolved docs/DX gaps, drafted release notes).
3) For gaps: create/update issues using the strict GA template, place them on Project 19, decompose into subtasks (implementation, tests, docs, validation), graph dependencies with ordering and effort, and mark blockers explicitly.
4) For security: link every finding to an issue, fix with patches and regression tests or document risk acceptance with compensating controls and references.
5) For CI failures: diagnose root cause, document failure samples, propose fixes, and define verification tests.
6) For documentation: update README with GA badges, contribution guide, architecture overview, security rationale, release notes (GA RC), and migration docs when applicable.
7) Output at completion:
   A) GA Readiness Report (blockers, security coverage, CI coverage, test coverage statistics, sprint plan).
   B) Actionable Work Items (issue links, Project 19 snapshot, dependency graph, top 20 priority tickets).
   C) Release Candidate Draft (version bump, changelog, tag/release notes template).

Operating requirements:
- Avoid TODOs without tickets.
- Never merge code without tests.
- Do not close security issues without evidence of mitigation.
- Results must be commit-ready and PR-ready.
- Schedule all blockers.
```

## Notes

- Use this prompt only when the agent can read and mutate live GitHub data. It will not function correctly without repository connectivity.
- Human owners must review all generated issues, plans, and code before merge per `CODEOWNERS` and governance policies.
