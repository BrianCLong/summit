# MC Capability Registry & Dynamic Agent Matchmaking

Track: MC (Management Console)
Branches: feature/mc-capability-registry, feature/mc-agent-discovery, feature/mc-skill-matching
Labels: track:mc, area:autonomy, area:agents

## Overview

- Establish a Management Console (MC) capability registry as the authoritative source for agent skills, credentials, runtime metadata, and health.
- Support dynamic discovery of new or updated agents through zero-touch onboarding, runtime heartbeats, and contract validation.
- Deliver a skill-matching service that scores agents against requested work packages, mission intents, or operator prompts and returns an ordered roster with explainability metadata.
- Ensure registry data synchronizes across regions and downstream services (orchestrator, marketplace, policy engine) via event streaming and cache invalidation.

## Problem Statement & Goals

**Drivers**

- Manual spreadsheets for agent capabilities cause drift, conflicting deployments, and security exposures.
- Operators lack visibility into agent readiness, dependencies, and trust posture when launching missions.
- Mission planners need automated pairing of agents to tasks based on skills, capacity, compliance, and resource costs.

**Goals**

- T0: Registry MVP with CRUD APIs, capability taxonomy, and MC UI slice for browse/search.
- T1: Dynamic discovery pipeline with signed capability manifests, heartbeat health scoring, and audit trail.
- T2: Skill-matching engine with weighted scoring model, policy filters, and explainability artifacts consumable by MC and orchestration flows.

## Capability Registry Architecture

### Service Topology

- **Registry Service (Node/TypeScript)** exposed via GraphQL and REST surfaces behind the MC gateway; persists to Postgres (authoritative) and Redis (query cache).
- **Capability Taxonomy Store** defines skill categories, proficiencies, compliance tags, hardware requirements; versioned via JSON schemas stored in S3-backed config service.
- **Event Stream (Kafka)** publishes `agent.capability.updated`, `agent.discovery.received`, `agent.health.changed` topics for downstream consumers (orchestrator, analytics, security policy engine).
- **MC UI Module** provides capability catalogue, skill filters, and agent roster views powered by GraphQL federated schema.

### Data Domains

- Agent Identity: UUID, display name, owner team, contact, signing keys.
- Capability Profile: skill id, taxonomy path, proficiency level (0-5), certifications, runtime features (GPU, tool access), cost metrics.
- Operational State: heartbeat timestamp, health score, SLA tier, current workload, compliance posture.
- Provenance & Audit: manifest hash, attestation chain, last validation, change history.

### Access Patterns

- Registry read throughput dominated by MC dashboards and orchestrator filters; apply read-through caching with TTL per agent cluster.
- Writes triggered by discovery events, manual overrides, or policy updates; use Postgres logical decoding to push change events.
- Support time-travel queries (retain 90 days of snapshots) via bitemporal tables or append-only change log.

## Dynamic Agent Discovery Flow

1. **Registration Manifest**
   - Agents expose signed `capability-manifest.json` containing identity, skill taxonomy, dependency graph, and policy claims.
   - MC Discovery Worker pulls manifests via service catalog or receives gRPC webhook; verifies signature, schema version, and required attestations.
2. **Quarantine & Validation**
   - New agents enter `pending_validation`; automated checks run (vulnerability scanning, policy guardrails, sandbox dry-run).
   - Human approvers can review diffs via MC UI; approvals emit `agent.discovery.approved` event.
3. **Activation & Heartbeats**
   - Upon approval, registry flips to `active` and emits capability snapshot to cache and event stream.
   - Agents send heartbeats (HTTP/gRPC) with workload metrics; missing N heartbeats triggers `degraded` status and alerts.
4. **Auto-Revocation**
   - Expired certificates or failing posture checks move agents to `revoked`; orchestrator receives blocklist event.

## Skill Matching Engine

### Inputs

- Mission request payload (intent tags, required skills, SLAs, cost ceiling).
- Agent capability profiles with health, availability, and trust scores.
- Policy constraints (jurisdiction, data sensitivity, tenant isolation).

### Matching Algorithm

- Normalize mission skill requirements into taxonomy nodes and proficiency levels.
- Compute base score = weighted cosine similarity between mission requirements vector and agent capability vector.
- Apply modifiers:
  - **Availability Factor**: penalize if current utilization > threshold.
  - **Trust Factor**: derived from compliance posture, attestations, past reliability.
  - **Cost Factor**: boost agents within budget, penalize expensive outliers.
  - **Policy Filter**: hard exclusion for non-compliant jurisdictions/data labels.
- Produce ordered roster with `score`, `explanations[]`, and `risk_flags[]`.
- Persist match decisions for audit; include SHAP-style explanation for MC UI.

### Interfaces

- GraphQL query `matchAgents(missionInput)` returning roster + rationale.
- Event-based invocation `mission.assignment.requested` → skill matcher service processes and emits `mission.assignment.recommended`.
- Optional streaming updates for long-running missions as agent states change.

## Data Model Sketch

```sql
create table agent (
  id uuid primary key,
  name text not null,
  owner text not null,
  status text check (status in ('pending_validation','active','degraded','revoked')),
  manifest_hash text not null,
  last_seen_at timestamptz,
  health_score numeric check (health_score between 0 and 1),
  trust_tier text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table capability (
  id uuid primary key,
  agent_id uuid references agent(id),
  taxonomy_path ltree not null,
  proficiency smallint check (proficiency between 0 and 5),
  certifications jsonb,
  runtime_features jsonb,
  cost_profile jsonb,
  valid_from timestamptz,
  valid_to timestamptz
);

create table agent_match_audit (
  id uuid primary key,
  mission_id uuid,
  agent_id uuid,
  request_payload jsonb,
  match_score numeric,
  decision jsonb,
  created_at timestamptz default now()
);
```

- Utilize Postgres `ltree` for taxonomy traversal and partial matching.
- Store manifests and attestations in S3 with hash pointers to ensure immutability.
- Implement CDC pipeline pushing row changes to Kafka for cache invalidation.

## Integration Points

- **Orchestrator**: consumes registry API to allocate workloads; listens to `agent.health.changed` for failover.
- **Policy Service**: enforces jurisdiction/data policies before match results surface to operators.
- **Marketplace**: surfaces approved agents for subscription/billing; syncs cost profiles nightly.
- **Observability Stack**: emit metrics (`agent_active_total`, `agent_match_latency_ms`) and traces (OpenTelemetry) for debugging.

## Security & Compliance

- Enforce mutual TLS + mTLS cert rotation for discovery endpoints.
- Use OPA policies to validate manifests (allowed tools, data scopes) before activation.
- Maintain audit logs for all manual overrides; integrate with SIEM.
- Support tenant isolation via row-level security (RLS) keyed by org/tenant id.

## Implementation Plan

1. **Sprint 1 — Registry Foundations**
   - Scaffold MC registry service (NestJS or Express) with Postgres migrations and GraphQL schema.
   - Build MC UI browse page with filters; connect to registry read APIs.
   - Implement capability taxonomy management (CRUD + versioning).
2. **Sprint 2 — Discovery Pipeline**
   - Build manifest ingestion worker, signature verification, and quarantine workflows.
   - Add heartbeat ingestion with configurable thresholds and alert hooks.
   - Publish registry events to Kafka; wire orchestrator subscriber for updates.
3. **Sprint 3 — Skill Matching & Explainability**
   - Implement scoring engine with configurable weights and policy filters.
   - Provide GraphQL + event interfaces; persist audit trail.
   - Deliver UI components for match results (scorecards, rationale chips).
4. **Sprint 4 — Hardening & Scale**
   - Performance test (10k agents, 50 req/sec match queries) and optimize caching.
   - Add chaos tests for agent churn; verify failover and revocation flows.
   - Document runbooks, SLOs (p99 match latency < 400ms), on-call alerts.

## Risks & Open Questions

- Need consistent taxonomy governance to avoid skill sprawl; propose weekly review board.
- Heartbeat spam or malicious manifests require rate limiting and anomaly detection.
- Cross-region replication strategy (logical replication vs. CDC stream) must align with existing MC infra.
- Determine whether mission planner prefers push (recommendations) or pull (UI query) integration for final assignment.
