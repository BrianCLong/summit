# ADR 0003: Invariant-Carrying Context Capsules (IC³)

- Status: Accepted
- Date: 2026-01-01

## Context

Summit enforces safety, compliance, and mission-specific invariants. These constraints must travel
with the context payloads they govern, rather than living in loosely-coupled runtime checks.

## Decision

Wrap related context segments into invariant-carrying capsules. Capsules expose validation methods and
compose with provenance data. They are language-agnostic wrappers that ensure invariants are evaluated
whenever capsules are assembled or perturbed.

## Consequences

- Establishes a reusable capsule abstraction with explicit `validate` flows.
- Enables downstream enforcement to trace invariant failures to specific segments.
- Provides a baseline for attaching signatures or attestations to capsules in later iterations.
