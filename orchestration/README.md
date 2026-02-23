# Summit Orchestration (Maestro)

This module contains the logic for multi-agent coordination, task routing, and human-in-the-loop workflows.

## Key Concepts

- **Task Router**: Dispatches intents to the appropriate agent (e.g., `OSINT Agent`, `Financial Agent`).
- **Workflow Engine**: Manages long-running processes (e.g., "Deep Investigation").
- **Human Gate**: An interface for requiring approval before high-risk actions.

## Integration

The Orchestrator communicates with agents via the Agent Protocol (gRPC/HTTP) and emits audit logs to the Governance layer.

## Usage

See [AGENTS.md](../docs/AGENTS.md) for high-level documentation.
