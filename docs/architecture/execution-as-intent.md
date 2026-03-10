# Execution as Intent: The Summit Control Plane Pattern

## Problem
Currently, most AI systems execute work directly: applications call models and tools through local agent frameworks. This makes governance, policy enforcement, scheduling, and budget control impossible at the organizational level, because the execution occurs before any central control plane can observe or intervene.

## Solution: Execution as Intent
In Summit, AI work is requested via **ExecutionIntent**, not executed imperatively.

The application or agent submits a declarative intent describing the work they want to accomplish. The Summit control plane then acts as an Admission Controller: it evaluates the intent, applies policies (e.g., tool/model restrictions, data classification gates, and budget enforcement), binds the agent's identity, and produces an **ExecutionDecision**.

If admitted, Summit produces an **ExecutionPlan** which assigns runtime placement, authorized route references, and memory scoping.

## Core Resources

1. **ExecutionIntent**
   The declarative intent submitted by a client.
   Contains: `agent_ref`, `requester_ref`, `objective`, requested `tool_refs`, `data_class`, `budget_ref`, and `constraints` (latency, max cost).

2. **ExecutionDecision**
   The outcome of Summit's policy and admission phase.
   Contains: `decision_id`, `admit` (boolean), `reasons` for denial if applicable, and an `evidence_id` establishing the start of a verifiable audit trail.

3. **ExecutionPlan**
   The authorized configuration generated for the runtime to execute.
   Contains: `runtime_profile`, approved `tool_session_refs`, and `memory_scope`.
   This plan is cryptographically tied to the decision and must be presented by runners to perform actions.

## Governance Benefits
* **No-Bypass Mediation**: Direct execution fails closed; runners require a valid ExecutionPlan.
* **Deny-by-Default Policy**: Access must be explicitly granted based on identity and data classification.
* **Verifiable Audit**: Every execution step is linked to the original Summit-issued `evidence_id`.
* **Budget Economics**: Execution consumes centralized budgets securely.

This architecture enables Summit to transition from a workflow logger into an authoritative OS for organizational AI operations.
