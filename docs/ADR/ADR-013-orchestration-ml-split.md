# ADR 0013: Orchestration and ML Service Decoupling

## Status
Accepted

## Date
2025-10-27

## Context
The platform initially coupled orchestration logic (Maestro) closely with ML inference tasks to simplify early development. As the complexity of workflows increased and the number of specialized ML models grew, this coupling became a bottleneck. Scaling the orchestrator (bound by I/O and state management) required scaling the heavy ML dependencies, which was inefficient.

## Decision
We have decided to strictly decouple the Orchestration layer from the ML Inference layer.

1.  **Maestro (Orchestrator)** will focus solely on workflow state management, task dispatching, and retries. It will run as a lightweight Node.js service.
2.  **ML Services** will run as independent, stateless microservices (Python/FastAPI or TensorFlow Serving), exposing standard HTTP/gRPC APIs.
3.  **Communication** will occur via the `maestro-worker` layer, which acts as the client to the ML services.

## Consequences

### Positive
- **Independent Scaling:** Orchestrators can handle thousands of concurrent workflows with minimal resources, while ML services can scale on GPU nodes as needed.
- **Fault Isolation:** A crash in an ML model inference does not crash the orchestration logic.
- **Polyglot Support:** Orchestration logic remains in TypeScript, while ML engineers can work in Python without impacting the core platform code.

### Negative
- **Network Latency:** Internal function calls are replaced by network calls, introducing slight latency.
- **Operational Complexity:** We now manage two distinct sets of services and deployments.

## Compliance
- All new ML capabilities must be exposed via an API, not embedded as libraries in the Orchestrator.
- API contracts must be versioned to ensure backward compatibility during updates.
