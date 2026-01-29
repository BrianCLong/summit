# Agent Runtime Frontier: Summit vs. The Field
**Date:** 2026-01-26
**Source:** Automation Turn #5 Brief

## 1. The Runtime Shift
**Claim:** Orchestration layers are subsuming workflow engines (DAGs) into **Agent Runtimes**.
**Implication:** Static graphs are dead. Long-lived, stateful, interruptible actors are the new primitive.
**Summit Delta:**
- **Current:** `EnhancedAutonomousOrchestrator` has basic state but relies on DB polling.
- **Target:** A true "Agent OS" runtime with `PAUSE`, `RESUME`, `KILL` semantics and resource isolation.

## 2. Trajectory-Centric Evaluation
**Claim:** Evaluation is moving from step-accuracy to **Trajectory Health**.
**Implication:** We need SRE metrics for agents: convergence rate, oscillation, recovery.
**Summit Delta:**
- **Current:** `pnpm test` and `verify_evidence` focus on static output correctness.
- **Target:** `packages/eval/trajectory-metrics` to score live execution paths.

## 3. Cost as a First-Class Constraint
**Claim:** Cost controls are moving **Pre-Execution**.
**Implication:** Agents must budget before they act. "Let's see what happens" is unacceptable.
**Summit Delta:**
- **Current:** `CostEstimator.ts` exists but is heuristic and post-hoc in some places.
- **Target:** `packages/finops` with predictive modeling integrated into the Planner.

## 4. Governance = Charters + Gates
**Claim:** Governance is converging on **Charters** (static authority) + **Gates** (runtime checks).
**Implication:** Policy isn't just a document; it's a runtime wrapper.
**Summit Delta:**
- **Current:** `policy/supply_chain.rego` and `AGENTS.md` are static.
- **Target:** Runtime enforcement of "Agent Charters" defined in `AGENTS.md`.

## 5. Async Human-in-the-Loop
**Claim:** HITL is becoming **Asynchronous** and confidence-based.
**Implication:** No more blocking "waiting for user". Optimistic execution with rollback or bounded autonomy.
**Summit Delta:**
- **Current:** Blocking `approvals` table.
- **Target:** Non-blocking "Escalation" events and "Confidence" thresholds.
