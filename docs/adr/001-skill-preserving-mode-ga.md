# ADR 001: Skill Preserving Mode (SPM) GA Implementation

## Status
Proposed

## Context
Skill Preserving Mode (SPM) was an experimental feature to prevent AI-induced skill atrophy. To reach GA, it needs a centralized enforcement mechanism that can be used by various agents (e.g., DeepAgent-MVP) to modify their reasoning loop.

## Decision
We will implement a `PolicyRouter` and an `SPMEnforcer` in Python.
1. The `PolicyRouter` determines if SPM should be active based on context.
2. The `SPMEnforcer` provides the specific prompt augmentations required by the mode.
3. We will use standard Python `logging` to trace routing decisions.
4. Feature activation will be controlled via `feature_flags.json`.

## Consequences
- Agents must query the `SPMEnforcer` to get mode-specific prompt additions.
- Routing decisions are auditable via platform logs.
- New dependencies: standard `logging` and `json` modules.
