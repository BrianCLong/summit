# MPEP API Outline (Multi-Performer Evaluation Plane)

## Endpoints

- `POST /mpep/v1/executions`
- `GET /mpep/v1/executions/{executionId}`
- `GET /mpep/v1/executions/{executionId}/egress`
- `GET /mpep/v1/shards/{shardId}`

## Core Schemas

- `ScopeToken`
- `SandboxPolicy`
- `EgressReceipt`
- `ShardManifest`
