# SilentIntent v0 Specification

This specification defines a vendor-neutral format for "silent intent" signals derived from micro-movements (facial, EMG, etc.).

## Principles
- **Privacy First**: Raw biometric signals must never be included in the `meta` field.
- **Explicit Intent**: Primary focus is `command_decode`.
- **Inference Control**: `identity`, `emotion`, and `physiology` inference are gated by default.

## Schema
See `schema.json`.
