# Summit Production AI Architecture Blueprint

Status: Draft
Evidence Prefix: PAB

This blueprint outlines the production AI architecture for Summit, defining the boundaries, components, and provenance requirements for the agentic OSINT platform. It maps abstract system design patterns to Summit's specific components and execution model.

## Layers

### Ingress Plane
**Evidence ID:** PAB-INGRESS-001
- **Description:** API gateway, GraphQL/REST edge, authentication/authorization, rate limits.
- **Summit Mapping:** `services/api/`, `services/sandbox-gateway/`, `services/authz-gateway/`. Handles external requests and enforces rate limits and zero trust policies.

### Agent Control Plane
**Evidence ID:** PAB-AGENT-001
- **Description:** Planner/orchestrator, tool execution policy, budget/risk guards.
- **Summit Mapping:** `services/maestro-orchestrator/`, `agents/`, `services/agent-execution-platform/`. Manages multi-agent coordination, goal-seeking, and tool invocation.

### Knowledge Plane
**Evidence ID:** PAB-KNOWLEDGE-001
- **Description:** GraphRAG, vector retrieval, provenance ledger, knowledge graph.
- **Summit Mapping:** `services/graph-core/`, `services/graphrag_api/`, `services/prov-ledger/`, `services/retrieval/`. Provides semantic search, entity resolution, and temporal/bitemporal graph semantics.

### Ingest Plane
**Evidence ID:** PAB-INGEST-001
- **Description:** CSV/S3/REST/event ingestion, normalization, validation.
- **Summit Mapping:** `services/ingest/`, `ingestion/`, `services/stix-taxii-ingestion/`. Responsible for streaming ingest, normalization, and validation of raw intelligence.

### Model Plane
**Evidence ID:** PAB-MODEL-001
- **Description:** Embedding providers, inference adapters, model registry abstraction.
- **Summit Mapping:** `models/`, `inference/`, `providers/`. Abstraction layer for LLMs and embedding models, avoiding direct vendor lock-in.

### Workflow Plane
**Evidence ID:** PAB-WORKFLOW-001
- **Description:** Async jobs, replayable task execution, evidence capture.
- **Summit Mapping:** `services/workflow/`, `workflows/`, `automation/`. Manages distributed task queues and execution history.

### Observability Plane
**Evidence ID:** PAB-OBS-001
- **Description:** RED metrics, traces, logs, drift signals.
- **Summit Mapping:** `observability.py`, `metrics/`, `telemetry/`. Continuously tracks system health and operational metrics.

### Governance Plane
**Evidence ID:** PAB-GOV-001
- **Description:** Required checks, branch protection, evidence bundle validation.
- **Summit Mapping:** `governance/`, `ci/gates/`, `policy/`. Enforces validation, schema compliance, and bitemporal evidence verification.

### Security Plane
**Evidence ID:** PAB-SEC-001
- **Description:** Zero trust, secrets policy, abuse-case tests, deny-by-default.
- **Summit Mapping:** `zero-trust/`, `security/`, `runtime_security/`. Enforces strict data handling, least privilege, and threat mitigations.

### Ops Plane
**Evidence ID:** PAB-OPS-001
- **Description:** Runbooks, SLOs, rollback, incident hooks.
- **Summit Mapping:** `ops/`, `scripts/ops/`. Playbooks for operator actions and incident response.

## Non-goals
**Evidence ID:** PAB-NONGOALS-001
- No runtime service split in this PR stack.
- No provider-specific lock-in claims.
- No claims of exact parity with proprietary internal stacks (e.g., OpenAI/Anthropic).
- No rewrite of Summit into separate deployables purely for diagram symmetry.
