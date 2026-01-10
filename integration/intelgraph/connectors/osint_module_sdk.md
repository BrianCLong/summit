# OSINT Module SDK

## Purpose

Provide a standardized interface for OSINT modules with policy, budget, and provenance hooks.

## Required Hooks

- `register(metadata)` with module metadata and legal/ToS notes.
- `execute(input, context)` returning redacted results.
- `estimate_cost(input)` for privacy budget and rate planning.

## Policy Requirements

- Active modules require explicit authorization token.
- Modules must emit witness chain entries for each execution.
