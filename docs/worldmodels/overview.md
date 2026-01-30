# World Models Overview

This document defines a backend-agnostic interface for interactive world simulators and the associated feature flags.

## Scope

- Provide a clean-room, Summit-native contract for world model backends.
- Keep functionality disabled by default until explicit enablement.

## Feature flags (kill switches)

- `SUMMIT_WORLDMODEL_ENABLE` (default: `0`): gate all world-model functionality.
- `SUMMIT_WORLDMODEL_BACKEND` (default: `none`): selected backend identifier.

## Interface summary

World model backends implement `WorldModelBackend` with a minimal `reset` / `step` / optional `stream` protocol.

- `reset(initial_state=None)` resets backend state.
- `step(action, prompt="")` returns a `StepResult` containing frames and metadata.
- `stream(actions, prompt="")` yields `StepResult` items for iterable actions.

## Evidence IDs

- `EVD-2601-20540-INTF-001`: WorldModel backend interface contract.
