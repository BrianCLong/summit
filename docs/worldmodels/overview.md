# Summit World Models Overview

This document defines the initial contract for world-model backends and the
kill-switch defaults. World-models are **deny-by-default** and remain disabled
until explicitly enabled through environment flags.

## Interface

Implementations must conform to `summit.worldmodels.WorldModelBackend`, exposing
`reset`, `step`, and `stream` while providing a `CapabilityDescriptor` for
runtime gating.

## Flags (kill-switch defaults)

- `SUMMIT_WORLDMODEL_ENABLE=0` (default): master enable switch.
- `SUMMIT_WORLDMODEL_BACKEND=none` (default): backend selector.

## Operating posture

- No backend is loaded unless the enable flag is explicitly set.
- Feature work remains gated behind the environment switch.
