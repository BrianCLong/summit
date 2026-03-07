# Agent Control Plane Architecture (2027 North Star)

Summit will operate as a graph-native, policy-native control plane for enterprise agent fleets.

## MAESTRO Layers

- Foundation
- Data
- Agents
- Tools
- Infra
- Observability
- Security

## Core subsystems

1. Capability Registry (`src/agents/controlplane/registry/`)
2. Policy Decision Point (`src/agents/controlplane/policy/`)
3. Task Planner (`src/agents/controlplane/planner/`)
4. Deterministic Router (`src/agents/controlplane/router/`)
5. Graph Context Compiler (`src/graphrag/context-compiler/`)
6. Durable Runtime (`src/agents/runtime/saga/`)
7. Flight Recorder (`src/agents/controlplane/telemetry/`)
8. Remediation Engine (future)
9. Human Authority Gateway (future)
10. Interop Fabric (future)

## Routing algorithm

Score =
- 0.30 capability confidence
- 0.20 graph relevance
- 0.15 prior success rate
- 0.10 latency fitness
- 0.10 cost fitness
- 0.10 determinism
- 0.05 observability

Tie-break order:
1. Lowest blast radius
2. Highest determinism
3. Lowest marginal cost
4. Lowest queue depth
5. Lexical `agent.id`

## Threats considered

- Prompt injection against retrieved context
- Unauthorized tool execution
- Agent sprawl with weak governance
- Non-deterministic behavior for high-risk tasks

## Mitigations

- Deny-by-default policy checks
- Tool and dataset allowlists
- Approval gate for high-risk requests
- Deterministic tie-breakers and evidence IDs
