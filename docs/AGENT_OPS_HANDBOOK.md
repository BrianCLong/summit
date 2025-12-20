# Agentic Operations Handbook

## Overview
The **Agentic Control Plane** automates the lifecycle of AI-driven development tasks in the Summit platform. It allows "Zero-touch" management where humans prioritize and approve, while agents (Claude, Codex, Jules) handle the execution.

## The CLI: `summitctl`

The primary interface is the `summitctl` command-line tool.

### 1. Initialize a Task
To start a new mission:
```bash
npx summitctl task init "Mission Name"
```
- Prompts for Agent selection (Claude, Codex, etc.).
- Creates a dedicated branch `agentic/<agent>/task-<id>-<name>`.
- Generates a task file in `.agentic-prompts/`.
- Commits the initial state.

**Action:** You then simply `git push` to trigger the agentic workflow.

### 2. Check Status
To see what agents are working on:
```bash
npx summitctl task status
```
Displays a table of active tasks, their assigned agents, branches, and status (e.g., `pr-open`).

### 3. Archive a Task
Once a PR is merged:
```bash
npx summitctl task archive <task-id>
```
- Marks the task as archived.
- Records final velocity metrics (time-to-merge).
- Frees up the agent "slot" (conceptually).

## Automation & Guardrails

### GitHub Actions
The `agentic-lifecycle.yml` workflow automatically:
1. Detects pushes to `agentic/**` branches.
2. Runs validation checks (CI, OPA policies, Security scans).
3. Automatically opens a PR if checks pass.
4. (Optional configuration) Auto-merges if all strict policies are met.

### Telemetry
Velocity metrics are tracked in `.agentic-tasks.yaml` (or a central store). Key metrics include:
- **Time to PR:** Duration from `init` to PR creation.
- **Time to Merge:** Duration from PR open to merge.
- **Revision Count:** Number of iterations required.

## Safety & Governance
- **Rate Limits:** Only N active tasks per lane are recommended.
- **Kill Switch:** To stop a misbehaving agent, simply delete its branch or close its PR.
- **Policy Veto:** OPA policies in CI can block a merge even if tests pass (e.g., if architectural constraints are violated).
