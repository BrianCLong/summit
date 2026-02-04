# Agent Lattice V1

> **Status:** ARCHITECTURE
> **Owner:** Jules (Release Captain)
> **Last Updated:** 2025-05-15

## Philosophy: Lattice vs. Swarm

We reject the "Swarm" model (chaos, emergent behavior, unpredictable).
We adopt the **Lattice** model (structure, hierarchy, deterministic).

In the Summit Lattice, every agent has:

1. A **Role** (Scope of concern).
2. A **Rank** (Authority level).
3. A **Policy Context** (Constraint boundary).

## The Core Agents

| Agent | Avatar | Role | Rank | Primary Function | Implementation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Jules** | 🧑‍✈️ | **Release Captain** | **Strategic** | Strategy, Architecture, Release Decisions. "The Lawmaker". | `ChangeReviewAgent` (Conceptual), `AGENTS.md` Owner. |
| **Maestro** | 🎼 | **Orchestrator** | **System** | Task dispatch, Dependency management, Safety enforcement. | `EnhancedAutonomousOrchestrator` (`server/src/autonomous/orchestrator.enhanced.ts`). |
| **Codex** | 💻 | **Engineer** | **Tactical** | Implementation, Coding, Testing. | LLM Interfaces, `Task` Executors. |
| **Aegis** | 🛡️ | **Guardian** | **Governance** | Policy evaluation, Risk scoring, Blocking. | `PolicyEngine` (`server/src/autonomous/policy-engine.ts`). |

## The Lattice Protocol

Agents communicate via **Tasks** managed by the Orchestrator. Direct agent-to-agent chatter is discouraged unless mediated by a Task.

### The Task Structure (`orchestrator.enhanced.ts`)

```typescript
interface Task {
  id: string;
  type: string;             // e.g., 'deploy', 'scan_code'
  params: Record<string, any>;
  safetyCategory: 'read' | 'write' | 'deploy';
  requiresApproval: boolean;
  idempotencyKey: string;   // PREVENTS DOUBLE EXECUTION
}
```

### The Safety Handshake

Before **Maestro** dispatches a task to **Codex**:

1. Maestro asks **Aegis**: "Can Codex do `deploy` on `prod`?"
2. Aegis evaluates `PolicyRules`.
3. Aegis returns `RiskScore` and `Allowed: boolean`.
4. Maestro executes or blocks.

## Governance Integration

The Lattice is **aware** of the `ProvenanceLedger`.

* **Jules** signs Release Roots.
* **Codex** commits code (which is witnessed).
* **Aegis** signs Policy Decisions.

This ensures that "Robot Work" is just as audited as "Human Work".
