# Debt Budgets

This document outlines the budgeting rules for technical debt, configured in `debt/budgets.json`.

## Core Rules

1. **No New Debt**: The default budget for new debt is **0**.
2. **Monotonic Improvement**: Every significant change should aim to reduce debt.

## Budget Scopes

- **Global**: Applied to the entire repository.
- **Sprint**: Applied to a specific timebox.
- **Agent**: Applied to autonomous agents.

## Agent Constraints

Agents are strictly forbidden from introducing new debt. They must always leave the codebase in a cleaner state than they found it.

## Severity Weights

- **Low (1)**: TODOs, minor lint warnings.
- **Medium (3)**: Disabled rules, incomplete types.
- **High (10)**: Skipped tests, major feature gaps.
- **Critical (50)**: Security bypasses, hardcoded secrets.
