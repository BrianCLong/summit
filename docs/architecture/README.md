# Summit Architecture Overview (GA-Aligned)

This document provides the authoritative, GA-ready map of the Summit platform, aligning the control plane, data plane, and experience layer under one navigable surface. It establishes the architectural context for governance, security, release management, and streaming so GA owners can trace every readiness gate to a system asset.

## Purpose and Scope
- Serve as the single entry point for GA stakeholders to understand how Summit is assembled and where to verify readiness.
- Anchor architectural decisions to codified governance and security controls.
- Cross-link release and streaming pathways to the operational runbooks that enforce GA quality.

## System Topology
- **Control Plane (Maestro + Policy)**: Orchestrates workflows, tenancy boundaries, and policy enforcement. See [service mesh architecture](service-mesh-architecture.md) and [OPA gateway integration](opa-gateway-integration.md).
- **Data Plane (IntelGraph + Provenance)**: Graph analytics, persistence, and auditability. Reference [system map](system-map.png) and [provenance ledger](prov-ledger.md) for data lineage and event guarantees.
- **Experience Layer (Web + Copilots)**: Client applications consuming the control/data plane via GraphQL and streaming APIs. See [day 1 topology](day1-topology.md) for front-door routing and caching.

## Cross-Cutting Guardrails
- **Governance**: Bound by the [Constitution](../governance/CONSTITUTION.md) and [Meta-Governance Framework](../governance/META_GOVERNANCE.md); operationalized through the [Living Rulebook](../governance/RULEBOOK.md).
- **Security**: Enforced through the [Advanced Security Platform](../security/ADVANCED_SECURITY_PLATFORM.md), [CIS Controls Checklist](../security/CIS_CONTROLS_CHECKLIST.md), and zero-trust posture described in [zero-trust architecture](zero-trust.md).
- **Release Management**: Delivery gates follow [release steps](../release/release_steps.md) and [canary/rollback strategy](../release/canary_manager_synthetic_probes_auto_rollback.md) with quality templates in [release QA](../release/quality-template.md).
- **Streaming**: Real-time pipelines follow the [streaming architecture](../streaming/ARCHITECTURE.md) and [streaming readiness guide](../streaming/README.md) for throughput, ordering, and replay guarantees.

## Readiness Traceability
- **Configuration & Flags**: Platform toggles and blast radius controls are cataloged in [CONFIGURATION_AND_FLAGS.md](CONFIGURATION_AND_FLAGS.md).
- **Dependency Health**: Service dependencies and blast radius mapping are tracked via [dependency graph](dependency-graph.md) and [blast radius report](blast-radius-report.txt).
- **Resilience & Observability**: SLOs and telemetry instrumentation are defined in [phase2-slo-observability.md](phase2-slo-observability.md) and [service-mesh implementation summary](service-mesh-implementation-summary.md).

## Navigation for GA Owners
- Architectural decisions: [ADR index](ADR_INDEX.md) for lineage of changes.
- Data contracts and schemas: [event schemas](event-schemas.md) and [semantic search system](semantic-search-system.md).
- Compliance overlays: [cross-repo governance](cross-repo-governance.md) and [dead code policy](dead-code-policy.md).
- Performance and scaling: [SCALING.md](SCALING.md) and [feed processor throughput](feed-processor-throughput.md).

The architecture described here is the authoritative reference for GA. Any deviations must be reconciled with the governance and release processes before promotion.
