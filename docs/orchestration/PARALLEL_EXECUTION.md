# Parallel Execution System

This document outlines the intelligent task routing and parallel execution system designed to maximize agentic throughput while maintaining quality gates.

## 1. Overview

The system is designed to accelerate development velocity by identifying and orchestrating parallelizable work streams from the project backlog. It consists of three main components:

1.  **Backlog Analysis:** A script that analyzes the backlog to classify tasks and identify opportunities for parallel execution.
2.  **Task Routing:** A simulation that assigns tasks to the most appropriate agent and detects potential conflicts.
3.  **Velocity Dashboard:** A dashboard that provides a real-time view of development throughput and key quality metrics.

## 2. Backlog Analysis

The backlog analysis is performed by the `scripts/orchestration/analyze_backlog.mjs` script. It uses the `gh` CLI to fetch live issue data from the repository and produces an analysis artifact at `artifacts/orchestration/backlog_analysis.json`.

**Note:** Running this script locally requires the [GitHub CLI (`gh`)](https://cli.github.com/) to be installed and authenticated.

The analysis includes:

-   **Parallelizable Groups:** Tasks grouped by component, which can be worked on concurrently.
-   **Agent Routing Recommendations:** Suggestions for which agent (Jules, Codex, etc.) is best suited for each task.

## 3. Conflict-Free Task Routing

The `scripts/orchestration/parallel_task_router.mjs` script simulates the process of routing tasks to agents. It uses the output of the backlog analysis to select a set of non-conflicting tasks for parallel execution.

Conflict detection is currently based on task components. If two tasks modify the same component, they are flagged as a potential conflict.

## 4. Development Throughput Dashboard

The `scripts/orchestration/generate_velocity_dashboard.mjs` script generates a Markdown dashboard that provides a snapshot of development velocity. The dashboard is located at `artifacts/orchestration/velocity_dashboard.md` and includes metrics such as:

-   Active parallel work streams
-   PRs merged per week
-   Merge queue depth
-   Conflict rate
-   Agent utilization
