# Universal AI Execution Ledger

## Overview
Inspired by composable workflows and centralized status maps, the Universal AI Execution Ledger replaces fragmented logging with a single, append-safe, policy-aware ledger. It is the single source of truth for agent execution history.

## Core Properties
1. **Append-Only Event Log**: All transitions (`workflow.started`, `step.started`, `policy.allowed`, etc.) are written sequentially.
2. **Deterministic & Replayable**: Evidence IDs and deterministic timing (during tests) allow exact replay and regression tests.
3. **Projections (Status Maps)**: Current state is built continuously from the log.

## Status vs. Ledger
Instead of mutating the state in a database row, we persist immutable events. The "status map" is a view (projection) constructed from events.
