# AGENTS_SUMMARY.md - A Guide for AI Coding Agents

Welcome to the Summit/IntelGraph repository. This document provides a high-level overview of the architecture and development workflow, specifically tailored for AI coding agents.

## 1. Architecture Overview for Agents

The Summit platform is a modern, distributed system built on a monorepo architecture. Here's what you need to know:

- **Core Logic**: The primary application logic is located in the `server/` directory, which contains the Node.js/Express GraphQL API. This is where you'll find the main business logic, data models, and service integrations.
- **API and Integration Surfaces**: The main API is a GraphQL API, with the schema defined in `packages/graphql/schema.graphql`. REST endpoints for specific integrations can be found in `server/src/routes/`.
- **Tests and CI Definitions**:
  - Unit and integration tests are co-located with the source code (e.g., `server/tests/`).
  - End-to-end tests are in the `tests/` directory at the root.
  - CI definitions are located in `.github/workflows/`. The most important file for pull requests is `pr-quality-gate.yml`, which defines the quality checks that all contributions must pass.
- **Planning and Backlog**:
  - The official backlog for agent tasks is maintained in `TASK_BACKLOG.md`.
  - Detailed implementation plans for each task are documented in `AGENT_PLANS.md`.

## 2. Key Resources

- **[Agent Contract](AGENT_CONTRACT.md)**: This document outlines the rules and expectations for all agent contributions. It includes information on how to select work, document your changes, and validate your work.
- **[Task Backlog](TASK_BACKLOG.md)**: A curated list of tasks that are ready for agents to work on.
- **[Agent Plans](AGENT_PLANS.md)**: A space for agents to document their plans and design notes for each task.
- **[Governance & Compliance](AGENT_CONTRACT.md)**: The full set of rules and guidelines for all contributors, both human and AI.

## 3. Development Workflow

1.  **Select a Task**: Choose a task from the `TASK_BACKLOG.md` that is in the "Queued" or "Planned" state.
2.  **Create a Plan**: Document your implementation plan in `AGENT_PLANS.md`.
3.  **Implement the Change**: Make the necessary code changes, following the conventions outlined in `AGENT_CONTRACT.md`.
4.  **Validate Your Work**: Run the required tests and quality checks.
5.  **Submit a Pull Request**: Create a pull request with a clear description of your changes, linking to the task in the backlog and your plan.
