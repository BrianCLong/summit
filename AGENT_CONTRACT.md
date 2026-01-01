# AGENT_CONTRACT.md - The Contract for AI Coding Agents

This document outlines the specific, non-negotiable rules and procedures that all AI coding agents must follow when contributing to the Summit/IntelGraph repository. Adherence to this contract ensures that all changes are safe, consistent, and easy to review.

## 1. Selecting and Scoping Work

- **Source of Truth**: All tasks must originate from `TASK_BACKLOG.md`. Do not work on tasks that are not explicitly defined in this file.
- **Task Status**: Only select tasks that are in the "Queued" or "Planned" status.
- **Atomic Changes**: Each pull request should address a single task from the backlog. Do not bundle multiple tasks into a single PR.

## 2. Documenting Your Work

1.  **Update Backlog Status**: Before starting work, update the status of your chosen task in `TASK_BACKLOG.md` from "Queued" to "In Progress".
2.  **Create a Plan**: In `AGENT_PLANS.md`, create a new section for your task (e.g., `### TASK-ID-001: Implement new feature`). This section must include:
    - A brief overview of your proposed solution.
    - A step-by-step implementation plan.
    - A clear testing strategy, including any new tests you will add.
3.  **Commit Messages**: All commit messages must follow the Conventional Commits specification (e.g., `feat:`, `fix:`, `docs:`).
4.  **Pull Request Description**: The pull request description must include:
    - A clear summary of the changes.
    - A link to the task in `TASK_BACKLOG.md` (e.g., "Resolves TASK-ID-001").
    - A link to your plan in `AGENT_PLANS.md`.

## 3. Validating Your Work

Before submitting your pull request, you must run the following validation commands from the root of the repository. A pull request will not be reviewed or merged if any of these checks fail.

### 3.1. The "Golden Path"

The most critical validation is the "Golden Path" smoke test, which ensures that the entire stack is functioning correctly.

```bash
make smoke
```

### 3.2. Code Quality and Formatting

Ensure your code is properly formatted and passes all linting checks.

```bash
# Run linting checks
pnpm run lint

# Apply formatting
pnpm run format
```

### 3.3. Testing

In addition to the "Golden Path", you must run the relevant tests for the code you have changed.

```bash
# Run all tests
pnpm test

# Run tests for a specific package (e.g., server)
pnpm --filter intelgraph-server test
```

## 4. Documentation and Changelogs

- **Documentation**: If your change affects user-facing functionality, you must update the relevant documentation in the `docs/` directory.
- **Changelogs**: For any new features (`feat`) or bug fixes (`fix`), you must create a changeset. This will automatically generate a changelog entry upon release.

```bash
# Create a changeset
pnpm changeset
```

Follow the prompts to describe your change. This is a mandatory step for all user-facing changes.
