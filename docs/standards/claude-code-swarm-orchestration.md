# Claude Code Swarm Orchestration Standard

## 1. Overview
This standard defines the "Swarm Orchestration" capability for Summit, inspired by the Claude Code "Teammate" pattern. It provides a deterministic, policy-gated, and auditable runtime for multi-agent collaboration.

## 2. Core Primitives
*   **Team:** A group of agents with a shared mission and context.
*   **Task:** A unit of work with status, dependencies, and ownership.
*   **Message:** A signed, immutable communication between agents.

## 3. Evidence Requirements
All swarm executions MUST produce an **Event Log** (`events.jsonl`) that satisfies:
*   **Determinism:** Replaying the log produces identical state.
*   **Append-Only:** History is never rewritten.
*   **Verification:** All messages are signed; all permission checks are logged.

## 4. Policy Gates
*   **Deny-by-Default:** Agents cannot perform sensitive actions (start task, approve join) without explicit policy allowance.
*   **Policy-as-Code:** Rules are defined in Rego (`policies/orchestrator.rego`).

## 5. Usage
Use the `summit orch` CLI to interact with swarms.
```bash
summit orch team spawn <name>
summit orch task create <subject>
```
