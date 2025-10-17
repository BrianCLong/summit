# Orchestration Knowledge Graph Schema

## Design Goals
- Unify pipelines, services, environments, incidents, policies, and cost telemetry into a single semantic layer.
- Provide deterministic identifiers for AI reasoning, what-if analysis, and compliance attestation.
- Support incremental ingestion from package connectors (`meta-orchestrator`, `maestro-conductor`, `policy`, `cost-guard`).

## Core Entities
| Node Type | Identifier | Attributes | Primary Sources |
| --- | --- | --- | --- |
| `Service` | `service:{serviceId}` | name, owningTeam, tier, languages, dependencies | Maestro discovery registry, IaC inventory |
| `Environment` | `env:{environmentId}` | name, stage (`dev`, `staging`, `prod`), region, deploymentMechanism, complianceTags | Terraform state, Maestro environment map |
| `Pipeline` | `pipeline:{pipelineId}` | name, owner, goldenPath, changeWindow, linkedStages[] | Meta Orchestrator stage catalog |
| `PipelineStage` | `stage:{stageId}` | serviceId, environmentId, capability, guardrails, policies | Meta Orchestrator plan definitions |
| `Incident` | `incident:{incidentId}` | serviceId, environmentId, severity, outcome, remediationId | Maestro incident journal |
| `PolicyRule` | `policy:{policyId}` | effect, actions, resources, obligations, riskTier | Policy engine configuration |
| `CostSignal` | `cost:{serviceId}:{timeBucket}` | saturation, budgetBreaches, throttleCount, slowQueryCount | Cost Guard telemetry |

## Relationships
- `Service` **DEPENDS_ON** `Service`
- `Service` **DEPLOYED_IN** `Environment`
- `PipelineStage` **TARGETS** `Service`
- `PipelineStage` **RUNS_IN** `Environment`
- `Pipeline` **CONTAINS** `PipelineStage`
- `Incident` **AFFECTS** `Service`
- `Incident` **OCCURRED_IN** `Environment`
- `PolicyRule` **GOVERNS** `Service`, `PipelineStage`, or `Environment`
- `CostSignal` **OBSERVED_FOR** `Service`

## Temporal Dimensions
- All nodes capture `createdAt`, `updatedAt`, and optional `validThrough` timestamps.
- Relationships include `observedAt` to support time-sliced impact analysis.

## Compliance & Security Fields
- `Service.soxCritical`, `Service.piiClassification`
- `Environment.zeroTrustTier`
- `PolicyRule.riskTier` used to determine approval requirements.
- `Incident.rootCauseCategory` for proactive anomaly detection.

## Graph API Contracts
- `upsertNodes(entityType, entities[])`
- `linkNodes(sourceId, relationship, targetId, metadata)`
- `snapshot()` returns immutable view consumed by AI translators and predictive engines.
- `querySubgraph({ serviceId?, environmentId?, includeIncidents?, includePolicies? })`

## Governance
- Schema definitions maintained under version-controlled `ga-graphai/packages/knowledge-graph/schema.json`.
- Changes require architecture review and automated compatibility validation via Vitest snapshot suite.
