# Agentic Mesh Architecture

> **Version**: 1.0.0
> **Status**: Active Development
> **Last Updated**: 2025-11-21

## Overview

The Agentic Mesh is a secure, auditable, ultra-resilient multi-LLM, multi-tool, multi-agent fabric designed for production intelligence and product organizations. It functions as a self-healing, policy-aware, provenance-first nervous system.

## Design Principles

1. **Provenance First** - Every decision, tool call, and model invocation is traceable
2. **Policy Everywhere** - OPA/ABAC-style enforcement at every choke point
3. **Mesh Topology** - Dynamic agent discovery and collaboration, no single orchestrator bottleneck
4. **Explicit Lifecycle** - Agent creation, routing, health checks, and retirement are code-defined
5. **Multi-Model Smart Routing** - Task, risk, cost, and latency-aware model selection

---

## Core Services

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGENTIC MESH                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   mesh-      │  │   routing-   │  │   policy-    │  │  provenance- │    │
│  │ orchestrator │◄─┤   gateway    │◄─┤   enforcer   │◄─┤   service    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         ▼                 ▼                 ▼                 ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    agent-    │  │    tool-     │  │   events-    │  │    task-     │    │
│  │   registry   │  │   registry   │  │     bus      │  │    queue     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATA STORES                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │    Redis     │  │    Neo4j     │  │     S3/      │    │
│  │  (metadata)  │  │   (cache)    │  │   (graph)    │  │    Minio     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Descriptions

| Service | Purpose | Port |
|---------|---------|------|
| **mesh-orchestrator** | Top-level task coordination, flow execution | 5000 |
| **routing-gateway** | Model/agent selection based on policy, cost, latency | 5001 |
| **policy-enforcer** | OPA-style policy evaluation for all operations | 5002 |
| **provenance-service** | Audit trail, decision lineage, explainability | 5003 |
| **agent-registry** | Agent discovery, capability matching, health checks | 5004 |
| **tool-registry** | Tool discovery, invocation proxying, rate limiting | 5005 |
| **events-bus** | Pub/sub for async agent communication (Redis Streams/Kafka) | 5006 |
| **task-queue** | Durable task scheduling and retry (BullMQ/Temporal) | 5007 |

---

## Data Stores & Schemas

### PostgreSQL (Primary Metadata)

```sql
-- Core task tracking
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES tasks(id),
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  input JSONB NOT NULL,
  output JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Agent registration
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) UNIQUE NOT NULL,
  version VARCHAR(32) NOT NULL,
  role VARCHAR(64) NOT NULL,
  risk_tier VARCHAR(16) NOT NULL,
  capabilities JSONB NOT NULL,
  model_preference JSONB,
  status VARCHAR(32) DEFAULT 'active',
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ
);

-- Tool registration
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) UNIQUE NOT NULL,
  version VARCHAR(32) NOT NULL,
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  risk_tier VARCHAR(16) NOT NULL,
  rate_limit INTEGER,
  cost_model JSONB,
  status VARCHAR(32) DEFAULT 'active'
);
```

### Redis (Cache & Queues)

- **Session state**: Agent working memory, scratchpads
- **Rate limiting**: Token buckets per agent/tool/model
- **Pub/sub**: Real-time agent coordination
- **Task queues**: BullMQ job scheduling

### Neo4j (Provenance Graph)

```cypher
// Provenance nodes
(:Task {id, type, status, created_at})
(:Agent {id, name, role})
(:ModelCall {id, provider, model, tokens_in, tokens_out, latency_ms})
(:ToolCall {id, tool_name, success, latency_ms})
(:PolicyDecision {id, action, reason})

// Relationships
(task)-[:ASSIGNED_TO]->(agent)
(task)-[:SPAWNED]->(subtask:Task)
(agent)-[:INVOKED]->(modelCall)
(agent)-[:CALLED]->(toolCall)
(agent)-[:SUBJECT_TO]->(policyDecision)
(modelCall)-[:PRODUCED]->(output)
(task)-[:REVIEWED_BY]->(criticAgent:Agent)
```

### Object Storage (S3/Minio)

- Large artifacts (code, documents, embeddings)
- Prompt/response archives (for compliance)
- Model checkpoints and fine-tuning data

---

## Security Boundaries & Trust Zones

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                                │
│  (External APIs, User Input, Third-party Models)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Policy Enforcement Point
┌─────────────────────────────────────────────────────────────────┐
│                    DMZ / GATEWAY ZONE                            │
│  routing-gateway, policy-enforcer                                │
│  - Input validation & sanitization                              │
│  - Rate limiting                                                │
│  - Authentication / Authorization                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ mTLS / Service Mesh
┌─────────────────────────────────────────────────────────────────┐
│                    TRUSTED ZONE                                  │
│  mesh-orchestrator, agent-registry, provenance-service          │
│  - Internal service communication only                          │
│  - All calls logged to provenance                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Encrypted connections
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ZONE                                     │
│  PostgreSQL, Redis, Neo4j, S3                                   │
│  - Encryption at rest                                           │
│  - Network isolation                                            │
│  - Audit logging                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Sandboxing

- Agents run in isolated containers with restricted capabilities
- File system access via allowlisted paths only
- Network egress via policy-enforced proxy
- Resource limits (CPU, memory, tokens) per agent tier

### Secrets Management

- Kubernetes Secrets / HashiCorp Vault for credentials
- No secrets in environment variables or config files
- Per-agent secret scopes (agents can only access their authorized secrets)

---

## Failure Domains & Backpressure

### Model Provider Failures

| Scenario | Response |
|----------|----------|
| Provider timeout | Retry with exponential backoff (3 attempts) |
| Provider down | Failover to secondary provider |
| Rate limit hit | Queue tasks, apply backpressure |
| Token budget exceeded | Reject task with clear error |

### Agent Failures

| Scenario | Response |
|----------|----------|
| Agent crash | Re-route to equivalent agent |
| Agent timeout | Kill, log, retry on different agent |
| Agent produces invalid output | Route to CriticAgent for review |
| No available agents | Queue with SLO-aware timeout |

### Backpressure Mechanisms

1. **Circuit breakers** - Per-provider, per-agent
2. **Token bucket rate limiting** - Global and per-entity
3. **Priority queues** - Critical tasks preempt low-priority
4. **Graceful degradation** - Reduce quality/cost tradeoff under load

---

## CI/CD & Infrastructure

### Docker Images

```
ghcr.io/summit/mesh-orchestrator:latest
ghcr.io/summit/routing-gateway:latest
ghcr.io/summit/policy-enforcer:latest
ghcr.io/summit/provenance-service:latest
ghcr.io/summit/agent-registry:latest
ghcr.io/summit/tool-registry:latest
```

### Helm Chart Structure

```
helm/agentic-mesh/
├── Chart.yaml
├── values.yaml
├── values-prod.yaml
├── templates/
│   ├── mesh-orchestrator/
│   ├── routing-gateway/
│   ├── policy-enforcer/
│   ├── provenance-service/
│   ├── configmaps/
│   └── secrets/
```

### GitHub Actions Workflows

```yaml
# .github/workflows/mesh-ci.yml
- Build & test all services
- Security scanning (Trivy, CodeQL)
- Integration tests against test mesh
- Deploy to staging on main merge
- Manual promotion to production
```

---

## API Contracts

### Task Submission

```typescript
POST /api/v1/tasks
{
  "type": "code_refactor",
  "input": { "spec": "...", "target": "src/foo.ts" },
  "priority": 1,
  "metadata": { "requester": "user@example.com" }
}

Response:
{
  "taskId": "uuid",
  "status": "queued",
  "estimatedCompletion": "2025-11-21T12:00:00Z"
}
```

### Agent Registration

```typescript
POST /api/v1/agents
{
  "name": "coder-agent-v1",
  "version": "1.0.0",
  "role": "coder",
  "riskTier": "medium",
  "capabilities": ["typescript", "python", "refactoring"],
  "modelPreference": { "provider": "anthropic", "model": "claude-sonnet-4-5-20250929" }
}
```

### Provenance Query

```typescript
GET /api/v1/provenance/task/{taskId}

Response:
{
  "taskId": "uuid",
  "timeline": [
    { "timestamp": "...", "agent": "planner", "action": "task_received" },
    { "timestamp": "...", "agent": "planner", "action": "subtask_created", "subtaskId": "..." },
    { "timestamp": "...", "agent": "coder", "action": "model_call", "modelCallId": "..." }
  ],
  "graph": { /* Neo4j subgraph */ }
}
```

---

## Next Steps

1. **Phase 1** - SDK types and BaseAgent implementation
2. **Phase 2** - Routing gateway and policy enforcer
3. **Phase 3** - Mesh orchestrator with task flows
4. **Phase 4** - Observability and provenance visualization
5. **Phase 5** - DX examples and documentation
