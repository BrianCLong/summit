# Blackboard Ledger

The Blackboard is a durable shared reality for agents, acting as the central coordination point for the "Adversarial PR Train".

## Structure

- **Schema**: Defined in `schema.yaml`.
- **State**: The current state of the sprint, tasks, leases, and circuit breakers.
- **Log**: An append-only log of events (not yet implemented in scaffolding).

## Usage

Agents read the blackboard to find work, claim leases, and update task states.
Humans or high-level policies update circuit breakers and sprint goals.

## Core Components

1.  **Sprint**: The current objective context.
2.  **Tasks**: The unit of work, tracking state `ANALYSIS -> DONE`.
3.  **Leases**: Mutual exclusion locks for agents working on tasks.
4.  **Circuit Breakers**: Global overrides for safety (PAUSE, FREEZE).
