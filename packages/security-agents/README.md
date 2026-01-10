# Summit Security Agents

Foundational scaffolding for the Summit SecOps Autonomy initiative. The package groups agent runtime primitives, schemas, connectors, and policy bundles with safety-first defaults.

## Structure

- `agent-runtime/`: planner skeleton, tool routing, and memory hooks with bounded execution.
- `connectors/`: ingest hooks for alerts/events, SIEM placeholder, and ticketing draft helper.
- `policy/`: OPA bundle starter with guardrails for read/advise, recommend/plan, and act.
- `schemas/`: zod schemas for Alert, Event, Finding, Asset, Identity, Control, Incident, Playbook, AgentAction, and Remediation.

## Usage

Import schemas and runtime helpers to assemble bounded workflows:

```ts
import { AgentRuntime } from './agent-runtime/runtime.js';
import { alertSchema } from './schemas/entities.js';
```

Policies default to read-only. Escalation requirements must be satisfied before executing any `act` step.
