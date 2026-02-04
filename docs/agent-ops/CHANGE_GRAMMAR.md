# Summit Adversarial PR Train & Change Grammar

> **Status**: Experimental (PR-0)
> **Goal**: Ship production-quality changes with minimal human bottleneck by making agents behave like disciplined peers—and produce audit-grade artifacts every time.

## Overview

This document defines the **Change Grammar** and **Adversarial PR Train** architecture for Summit. It reframes autonomous coding as a disciplined multi-agent pipeline where agents have separation of duties, coordination happens via a shared blackboard, and completion is externally validated.

## Core Concepts (The Change Grammar)

We define a canonical grammar of work as state transitions.

### States

`ANALYSIS → APPROVAL_PENDING → EXECUTION → VALIDATION → DONE`

**Forbidden Transitions:**

- No `ANALYSIS → EXECUTION` (must pass approval)
- No `EXECUTION → DONE` (must pass validation)

### Artifacts per Transition

| State                | Artifacts Required                                                        |
| :------------------- | :------------------------------------------------------------------------ |
| **ANALYSIS**         | Task proposal, risk assessment, acceptance tests outline                  |
| **APPROVAL_PENDING** | Explicit plan, scope definition, falsifiable `done_when` criteria         |
| **EXECUTION**        | Branch/worktree diff, tests written first (TDD), candidate implementation |
| **VALIDATION**       | CI results, Reviewer verdict, security checks, dependency diffs           |
| **DONE**             | Merge commit, **Evidence Bundle**, Provenance record                      |

## Architecture

### 1. Blackboard Ledger

A durable shared reality for agents, replacing chatty dialogue.

- **Snapshot**: `blackboard.yaml` (current state)
- **Log**: `blackboard.log` (append-only, signed events)
- **Metrics**: Attempt counts, failure clustering, drift detection.

### 2. Role Runtimes

Agents operate with strict separation of duties:

- **Planner**: Decomposes tasks, handles rescoping, manages dependency graph.
- **Coder**: Claims tasks, works in isolated workspace, produces candidate bundles. _Cannot merge._
- **Reviewer**: Validates against spec/`done_when`, rejects with actionable feedback. _Cannot implement._
- **Merge Supervisor**: Merges only when policy passes and Evidence Bundle is complete.

### 3. Contract Enforcement

- **Level 1**: Prompt Discipline (Human-readable rules)
- **Level 2**: Policy-as-Code (OPA/Rego checks on transitions)
- **Level 3**: CI Gates (Hard failures on missing artifacts)

### 4. Evidence Bundles (The Moat)

Every completed task emits a structured bundle containing:

- **Intent**: Spec references + `done_when` criteria.
- **Diff**: Patches + file surfaces touched.
- **Tests**: New/changed tests + coverage deltas.
- **Provenance**: Toolchain hashes, CI run IDs.
- **Security**: Dependency diffs, SAST results, secret scan.
- **Review**: Verdicts + structured rationale.

## Circuit Breakers

To prevent runaway autonomy:

- **PAUSE**: Global halt on new work.
- **FREEZE_MERGE**: Allow review but block merge.
- **SAFE_MODE**: Restrict to Tier 0-1 agents/tasks only.
- **BREAK_GLASS**: Human-only signed override (fully logged).

## Atomic PR Train Plan

### PR-0: Scaffolding (Current)

- Docs: `docs/agent-ops/CHANGE_GRAMMAR.md`
- Ops: `ops/blackboard/` (schema + example)
- Ops: `ops/circuit-breakers/`

### PR-1: Blackboard Engine

- CLI: `summit bb status|claim|release|transition`
- Lease TTL + renewal
- Append-only event log

### PR-2: Role Adapters

- Planner/Coder/Reviewer interfaces
- Handoff protocol implementation

### PR-3: Evidence Bundle v1

- Schema + Generator
- CI validation job

### PR-4: Contract-as-Code Gate

- Forbidden transition enforcement
- Degraded mode support

### PR-5: Hypothesis Exhaustion

- Attempt counters
- Auto-escalation to `RESCOPE_REQUIRED`
