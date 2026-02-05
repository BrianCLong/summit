# MARS Reflective Search Standards

This document defines the standards for implementing MARS-inspired mechanisms in Summit.

## Core Pillars
1. **Budget-Aware Planning**: All agent actions must be costed and constrained by a hard budget.
2. **Modular Construction**: Tasks follow a "Design-Decompose-Implement" pipeline.
3. **Reflective Memory**: Lessons are distilled from comparative analysis of solutions.

## Determinism
- Use fixed seeds for all probabilistic components.
- Ensure stable ordering in JSON artifacts.
- No unstable timestamps in reports (isolate to `stamp.json`).
