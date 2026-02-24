# MARS: Modular Agent with Reflective Search

## Overview
This document defines the technical standards for the implementation of MARS-inspired mechanisms within Summit. MARS (arXiv:2602.02660) is designed for autonomous AI research, specifically addressing expensive evaluation and opaque attribution.

## Pillars

### 1. Budget-Aware Planning (MCTS)
- **Mechanism**: Cost-constrained Monte Carlo Tree Search.
- **Implementation**: `summit/mars/planner_mcts.py`.
- **Constraint**: Every expansion must be validated against the `BudgetLedger`.
- **Determinism**: Must use a fixed seed for reproducible plans.

### 2. Modular Construction (DDI)
- **Mechanism**: Design-Decompose-Implement pipeline.
- **Implementation**: `summit/mars/pipeline.py`.
- **Contract**: Produces a task DAG with explicit dependencies.

### 3. Comparative Reflective Memory
- **Mechanism**: Diff-based lesson distillation.
- **Implementation**: `summit/mars/reflect.py`.
- **Output**: Structured `lessons.json` artifacts.

## Artifacts
All MARS runs must produce the following machine-verifiable artifacts:
- `plan.json`: The search tree and selected path.
- `ledger.json`: Cost accounting and budget enforcement.
- `lessons.json`: Distilled insights from solution diffs.
- `metrics.json`: Performance and budget adherence.
- `stamp.json`: Deterministic timestamp and git metadata.

## Governance
- **Deny-by-Default**: External training/execution is feature-flagged OFF.
- **Auditability**: Every decision must be recorded in the ledger with `cost_units`.
