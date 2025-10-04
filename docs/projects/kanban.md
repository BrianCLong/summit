# Project: Kanban — Platform

## Purpose

This project is used to visualize our workflow and limit work-in-progress (WIP) for the Platform team. It is designed for continuous flow rather than fixed-length sprints.

## Policies

*   **WIP Limits**: Each column has a Work-in-Progress limit. These are soft limits, but the team should strive to stay within them to maintain a smooth flow.
    *   `Ready`: 10
    *   `In Progress`: 8
    *   `Review`: 6
*   **Blocked Items**: If an item is blocked, it must be moved to the `Blocked` column and have a comment explaining the blocker in the `Blocked by` field.
*   **Review Gate**: An item cannot be moved to `Review` unless it has a linked Pull Request.

## Views

*   **Flow Board**: The main board view with columns representing the workflow stages.
*   **Throughput Chart**: A chart showing the number of items completed per week.
*   **Cycle Time Chart**: A chart showing the average time it takes for an item to move from `In Progress` to `Done`.

*Placeholder for screenshot of the board.*
