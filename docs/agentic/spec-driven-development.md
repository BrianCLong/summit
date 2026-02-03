# Spec-Driven Development (SDD) Playbook

## Summit Readiness Assertion

This playbook operates under the Summit Readiness Assertion and inherits the absolute readiness
requirements defined in `docs/SUMMIT_READINESS_ASSERTION.md`.

## Purpose

Spec-Driven Development (SDD) makes the spec the contract, the tasks the executable plan, and the
artifacts the evidence. The workflow is deterministic, machine-verifiable, and safe-by-default.
It exists to reduce rework, preserve context across sessions, and guarantee recoverability.

## When to use SDD

Use SDD for:
- Large refactors or migrations that require cross-team alignment.
- Multi-session work where context resets are expected.
- Any change that must be recoverable from a single source of truth.

SDD is intentionally constrained for small changes; default to the standard workflow when a spec
would not materially reduce risk or coordination cost.

## Core workflow (4 phases)

1. **Research**
   - Parallelize discovery into focused threads (policies, codebase, tests, ops).
   - Capture evidence, scope boundaries, and constraints as notes.

2. **Spec creation**
   - Write a deterministic spec using the repo template.
   - Treat the spec as the contract and the recovery point.

3. **Interview-style refinement**
   - Validate the spec against constraints, acceptance tests, threats, and non-goals.
   - Resolve ambiguities before implementation.

4. **Implementation**
   - Generate tasks from the spec.
   - Execute in dependency-aware order with atomic commits.
   - Produce deterministic artifacts as evidence.

## Why it works

- **Context isolation**: tasks are executed with fresh context, preventing cross-task contamination.
- **Persistence**: specs and tasks live on disk as recovery points.
- **Dependency-aware parallelism**: tasks encode blocked-by relationships to preserve order.
- **Backpressure**: local hooks and CI gates prevent incomplete work from merging.

## Prompt patterns (examples)

- **Research**: "Collect constraints, policies, and prior art. Output evidence only."
- **Spec**: "Draft the spec using the template. Use deterministic, testable language."
- **Interview**: "Challenge every requirement. Mark anything unresolved as Deferred pending X."
- **Implement**: "Execute tasks in DAG order. Produce artifacts and atomic commits."

## Spec as contract

- The spec is authoritative; tasks are derived artifacts.
- Deviations require a spec update first.
- All artifacts must use shared definitions and authority files.

## Checklist for authors

- [ ] Spec uses the template in `docs/specs/_template.md`.
- [ ] Acceptance tests are explicit and automatable.
- [ ] Threats and mitigations are enumerated.
- [ ] Task checklist is dependency-aware and scoped.
- [ ] Deterministic artifacts are defined (no timestamps).

## Grounding (ITEM claims)

- 4-phase workflow: ITEM:CLAIM-01.
- Parallel research subagents: ITEM:CLAIM-02.
- Spec as persistent source of truth: ITEM:CLAIM-03.
- Disk-persisted tasks: ITEM:CLAIM-04.
- Task CRUD patterns: ITEM:CLAIM-05.
- Context isolation + dependency-aware parallelism: ITEM:CLAIM-06.
- Backpressure via hooks and CI: ITEM:CLAIM-07.
- Multi-session task list IDs: ITEM:CLAIM-08.

## MAESTRO security alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection, task tampering, artifact poisoning, secret leakage.
- **Mitigations**: strict spec parsing, deterministic artifact generation, deny-by-default gates,
  never-log list enforcement.
