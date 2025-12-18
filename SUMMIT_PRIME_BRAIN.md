# Summit Prime Brain

## Purpose
The Prime Brain is the unified constitution for Summit. It aligns agents, prompts, automation, and governance so all workstreams move in lockstep and every session has a single source of truth.

## Scope and Responsibilities
- Define the canonical architecture (systems, agents, prompts, pipelines).
- Describe the agent directory schema and ownership boundaries.
- Specify lifecycle flows: session → branch → PR → review → merge → rollout.
- Set guardrails for autonomy, safety, and data handling.
- Establish observability, QA, and continuous improvement loops.

## Architecture Overview
- **Control Plane:** Governance rules, autonomy limits, escalation paths, and policy enforcement.
- **Execution Plane:** Runtime agents (Jules, Codex Recapture, Reviewer, Predictive, Executor, PsyOps) plus orchestration scripts.
- **Knowledge Plane:** Prompt bundles, playbooks, architecture docs, decision logs, and experiment notes.
- **Data Plane:** Repos, artifacts, telemetry, evaluation outputs, and provenance records.
- **Assurance Plane:** Tests, readiness checkers, PR gates, and audit trails.

## Agent System
- **Jules (Primary Dev):** Implements features/fixes, maintains branch hygiene, and aligns with prompts index.
- **Codex Recapture:** Regenerates lost diffs, reconciles session outputs with branches, and preps PRs.
- **Reviewer Agent:** Static/dynamic review, policy compliance, and merge-block criteria.
- **Predictive Agent:** Forecasts defects/risks, prioritizes backlogs, and supplies early warnings.
- **Executor/Orchestrator:** Runs pipelines, executes scripts, tracks state, and coordinates handoffs.
- **PsyOps/Sentinel:** Monitors for adversarial inputs, bias, and safety violations.

## Directory Schema (desired)
```
/agents/
  jules/
  codex/
  reviewer/
  predictive/
  psyops/
  executor/
/prompts/
  bundles/
  governance/
  recapture/
  reviewer/
  predictive/
/docs/
  architecture/
  governance/
  pipelines/
  playbooks/
/tests/
  governance/
  prompts/
  pipelines/
```
Each agent directory holds: runtime spec, prompts, handoff contracts, logging guidance, and test hooks.

## Prompt Governance
- Maintain a **PROMPTS.md** index linking every prompt file to its owner, scope, and last update.
- Version prompts in git; changes require review + regression checks.
- Prefer modular prompt bundles with clear inputs/outputs and compatibility notes.
- Enforce no orphaned prompts: every prompt maps to an agent or pipeline.

## Lifecycle Flow
1. **Session Intake:** Capture intent, scope, and constraints; bind to branch name.
2. **Workspace Prep:** Sync main, sanitize diffs, load prompts, and set telemetry hooks.
3. **Execution:** Agents operate with autonomy bounds; log actions and decisions.
4. **Readiness Check:** Run PR readiness checker (lint, tests, policy gates, diff sanity).
5. **PR Creation:** Auto-generate PR body, attach artifacts, request reviewer agent.
6. **Review & Merge:** Reviewer agent enforces policies; merge only with green checks and approval.
7. **Post-Merge:** Run rollout/validation playbooks; archive prompts + logs; update metrics.

## Assurance & Testing
- **Repo-wide harness:** lint, type, unit/integration, e2e (where applicable), security scans.
- **Governance tests:** autonomy boundaries, forbidden actions, escalation triggers.
- **Prompt tests:** contract tests for required inputs/outputs and safety filters.
- **Pipeline tests:** dry-run PR orchestrator and readiness checker in CI.

## Observability & Telemetry
- Track per-session metadata (scope, branch, prompts used, decision log, artifacts).
- Emit signals for build status, test coverage, code churn, PR latency, and regression risk.
- Maintain provenance: link commits to prompts, sessions, and validation reports.

## Safety & Compliance
- Enforce secret hygiene, dependency trust, and allowed-domain network policies.
- Autonomy limits with explicit escalation paths; require human review for high-risk actions.
- Bias/psyops guardrails: detect manipulation attempts and sanitize inputs.

## Continuous Improvement Loop
- Nightly sweep to detect stale branches, unindexed prompts, and failing pipelines.
- Weekly governance audit: update authority hierarchy, merge rules, and safety conditions.
- Quarterly architecture refresh: reconcile docs with reality and retire obsolete assets.

## Immediate Next Actions
- Stand up the `/agents` and `/prompts` trees with runtime specs and prompt bundles.
- Author PROMPTS.md as the global prompt index.
- Implement PR readiness checker + orchestrator + reviewer agent specs under `/docs/pipelines/`.
- Define predictive analytics architecture and signals under `/agents/predictive/` or `/docs/architecture/`.
- Wire governance tests into the repo-wide harness and gate merges on them.
