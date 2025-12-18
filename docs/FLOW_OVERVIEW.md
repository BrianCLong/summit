# Flow Overview

Flows define the sequence of actions for Summit to execute.

## Core Flows

- **session_to_pr**: Converts a dev session into a Pull Request.
- **pr_lifecycle**: Manages the PR review and merge process.
- **recapture_closed_prs**: Analyzes closed PRs for lost value.
- **auto_improve_daily**: Autonomous daily improvement cycle.
- **self_check**: System integrity validation.

## Definition
Flows are defined in `flows/*.yaml`.
