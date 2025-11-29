# Summit Prime Brain

The **Summit Prime Brain** is the canonical source of truth for all autonomous
agents in this repository. It defines the shared operating principles,
architecture contracts, and quality bars that every agent must follow.

## Purpose

- Maintain a cohesive architecture across agents and orchestration flows.
- Ensure work is production-grade, testable, and reviewable.
- Guard against regressions, security risks, and governance drift.

## Operating Principles

1. **Alignment first** – every action must align with the Prime Brain before
   local optimizations.
2. **PR-readiness** – changes should be shippable with tests, docs, and clear
   summaries.
3. **Observability** – prefer changes that improve telemetry, logging, and
   auditability.
4. **Safety** – avoid breaking changes or risky rollouts without safeguards.

## Interactions

Agents, flows, and analytics components should reference this document when
interpreting tasks, proposing changes, or evaluating risk. If a conflict arises
between local guidance and the Prime Brain, the Prime Brain takes precedence and
the conflict should be surfaced explicitly in the output.
