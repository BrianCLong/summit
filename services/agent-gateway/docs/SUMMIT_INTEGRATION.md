# Summit Platform Integration Guide

How the Agent Gateway integrates with Summit's existing systems.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Summit Platform                          │
│                                                              │
│  ┌────────────────┐      ┌──────────────────┐              │
│  │  Agent Gateway │◄────►│  AuthZ Gateway   │              │
│  │  (New)         │      │  (Existing)      │              │
│  └────────┬───────┘      └──────────────────┘              │
│           │                                                  │
│           ├──► OPA Policy Engine (Extended)                 │
│           │                                                  │
│           ├──► PostgreSQL (New Tables)                      │
│           │                                                  │
│           ├──► Provenance Ledger (Integration)              │
│           │                                                  │
│           ├──► OTEL / Prometheus (Metrics)                  │
│           │                                                  │
│           └──► Summit CLI / Orchestrator                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Database Integration

The Agent Gateway adds new tables to Summit's PostgreSQL database.

#### Migration

```sql
-- File: db/migrations/017_agent_framework.sql
-- Creates:
-- - agents
-- - agent_credentials
-- - agent_runs
-- - agent_actions
-- - agent_approvals
-- - agent_quotas
-- - agent_metrics
-- - agent_audit_log
```

#### Existing Table Dependencies

```sql
-- References existing tables:
FOREIGN KEY (organization_id) REFERENCES organizations(id)
FOREIGN KEY (owner_id) REFERENCES users(id)
FOREIGN KEY (project_id) REFERENCES projects(id)
FOREIGN KEY (approved_by) REFERENCES users(id)
```

#### Apply Migration

```bash
psql -U summit -d summit -f db/migrations/017_agent_framework.sql
```

### 2. OPA Policy Integration

Extends Summit's existing OPA policies with agent-specific rules.

#### Existing Policies

```
policy/
├── abac/
│   └── abac.rego          # Existing ABAC policies
├── rbac/
│   └── rbac.rego          # Existing RBAC policies
└── agent/
    └── agent_policy.rego  # NEW: Agent policies
```

#### Policy Precedence

```rego
# The agent policy integrates with existing ABAC/RBAC:

package summit.abac

# Existing user decision
user_decision := {...}

# New agent decision
agent_decision := {...}

# Combined decision
decision := user_decision if input.subject.type == "USER"
decision := agent_decision if input.subject.type == "AGENT"
```

#### Deploy Policies

```bash
# Copy agent policy
cp services/agent-gateway/policy/agent/agent_policy.rego infrastructure/opa/policies/

# Restart OPA
docker restart opa

# Verify policies loaded
curl http://localhost:8181/v1/policies
```

### 3. AuthZ Gateway Integration

The Agent Gateway can optionally integrate with the existing AuthZ Gateway.

#### Option A: Standalone (Recommended Initially)

```
Agent ──► Agent Gateway ──► Policy ──► Resources
```

Agent Gateway handles its own authentication and authorization.

#### Option B: Integrated with AuthZ Gateway

```
Agent ──► AuthZ Gateway ──► Agent Gateway ──► Resources
```

AuthZ Gateway validates agent tokens, then forwards to Agent Gateway.

##### Configuration

```typescript
// authz-gateway/src/middleware.ts

import { verifyAgentToken } from '@summit/agent-gateway';

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  // Check if it's an agent token
  if (token?.startsWith('agt_')) {
    const agent = await verifyAgentToken(token);
    if (agent) {
      req.principal = {
        type: 'AGENT',
        id: agent.id,
        name: agent.name,
        tenantScopes: agent.tenantScopes,
        capabilities: agent.capabilities,
      };
      return next();
    }
  }

  // Fall through to existing user auth
  // ...existing code...
}
```

### 4. Provenance Ledger Integration

Agent actions are recorded in Summit's provenance ledger.

#### Ledger Entry Format

```typescript
// services/prov-ledger/src/types.ts

interface ProvenanceEntry {
  id: string;
  actor: {
    type: 'USER' | 'AGENT' | 'SERVICE';
    id: string;
    name: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  timestamp: Date;
  metadata: {
    agentRunId?: string; // Links to agent_runs table
    operationMode?: 'SIMULATION' | 'DRY_RUN' | 'ENFORCED';
    riskLevel?: string;
    approved?: boolean;
  };
  previousHash: string;
  currentHash: string;
}
```

#### Integration Code

```typescript
// services/agent-gateway/src/ProvenanceLedgerClient.ts

import fetch from 'node-fetch';

export class ProvenanceLedgerClient {
  constructor(private ledgerUrl: string) {}

  async recordAgentAction(run: AgentRun, action: AgentAction) {
    const entry = {
      actor: {
        type: 'AGENT',
        id: run.agentId,
        name: action.agentName, // Would need to join with agents table
      },
      action: action.actionType,
      resource: {
        type: 'entity', // Or other resource types
        id: action.actionTarget,
      },
      metadata: {
        agentRunId: run.id,
        operationMode: run.operationMode,
        riskLevel: action.riskLevel,
        approved: action.approvedBy !== null,
      },
    };

    await fetch(`${this.ledgerUrl}/api/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  }
}
```

### 5. Observability Integration

Integrates with Summit's OpenTelemetry setup.

#### Existing OTEL Configuration

```typescript
// services/api/src/observability.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  serviceName: 'summit-api',
  // ...
});
```

#### Agent Gateway OTEL Integration

```typescript
// services/agent-gateway/src/observability.ts

import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('agent-gateway', '1.0.0');
const meter = metrics.getMeter('agent-gateway');

// Metrics
const agentRequestCounter = meter.createCounter('agent.requests', {
  description: 'Number of agent requests',
});

const agentActionDuration = meter.createHistogram('agent.action.duration', {
  description: 'Agent action duration in ms',
});

// Tracing
export async function traceAgentRun(agent: Agent, run: AgentRun, fn: () => Promise<void>) {
  return await tracer.startActiveSpan('agent.run', {
    attributes: {
      'agent.id': agent.id,
      'agent.name': agent.name,
      'run.id': run.id,
      'operation.mode': run.operationMode,
    },
  }, async (span) => {
    try {
      await fn();
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

#### Grafana Dashboards

Add agent-specific panels to existing dashboards:

```json
{
  "dashboard": {
    "title": "Summit Agents",
    "panels": [
      {
        "title": "Agent Requests",
        "targets": [{
          "expr": "rate(agent_requests_total[5m])"
        }]
      },
      {
        "title": "Agent Success Rate",
        "targets": [{
          "expr": "rate(agent_requests_total{status=\"success\"}[5m]) / rate(agent_requests_total[5m])"
        }]
      },
      {
        "title": "Policy Violations",
        "targets": [{
          "expr": "increase(agent_policy_violations_total[1h])"
        }]
      }
    ]
  }
}
```

### 6. CLI Integration

Agents can invoke Summit CLI commands through controlled wrappers.

#### Wrapper Implementation

```typescript
// services/agent-gateway/src/cli/CLIExecutor.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CLIExecutor {
  async execute(command: string, args: string[], agent: Agent): Promise<string> {
    // Validate command is allowed
    if (!this.isCommandAllowed(command, agent)) {
      throw new Error(`Command '${command}' not allowed for agent`);
    }

    // Build safe command
    const safeCommand = this.buildCommand(command, args);

    // Execute with timeout
    const { stdout, stderr } = await execAsync(safeCommand, {
      timeout: 30000, // 30 seconds
      env: {
        // Inject agent context
        SUMMIT_AGENT_ID: agent.id,
        SUMMIT_AGENT_NAME: agent.name,
      },
    });

    if (stderr) {
      throw new Error(stderr);
    }

    return stdout;
  }

  private isCommandAllowed(command: string, agent: Agent): boolean {
    const allowedCommands = [
      'maestro run',
      'maestro status',
      'maestro logs',
    ];

    return allowedCommands.some(allowed => command.startsWith(allowed));
  }

  private buildCommand(command: string, args: string[]): string {
    // Sanitize and build command
    const sanitized = args.map(arg => this.sanitizeArg(arg));
    return `${command} ${sanitized.join(' ')}`;
  }

  private sanitizeArg(arg: string): string {
    // Remove dangerous characters
    return arg.replace(/[;&|`$]/g, '');
  }
}
```

### 7. Orchestrator Integration

Agents can trigger pipelines and runbooks through the orchestrator.

#### Orchestrator API Client

```typescript
// services/agent-gateway/src/orchestrator/OrchestratorClient.ts

export class OrchestratorClient {
  constructor(private baseUrl: string) {}

  async triggerPipeline(
    pipelineId: string,
    parameters: Record<string, unknown>,
    agent: Agent
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/pipelines/${pipelineId}/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Id': agent.id,
        'X-Agent-Name': agent.name,
      },
      body: JSON.stringify({
        parameters,
        triggeredBy: {
          type: 'AGENT',
          id: agent.id,
          name: agent.name,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Pipeline trigger failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.runId;
  }

  async getRunStatus(runId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/runs/${runId}`);
    return response.json();
  }
}
```

### 8. Multi-Tenant Infrastructure

Leverages Summit's existing multi-tenant architecture.

#### Tenant Isolation

```typescript
// All agent queries respect tenant boundaries

// Bad: Could access other tenants
const entities = await db.query('SELECT * FROM entities');

// Good: Filtered by tenant
const entities = await db.query(
  'SELECT * FROM entities WHERE tenant_id = $1',
  [agent.tenantScopes[0]]
);
```

#### Row-Level Security (RLS)

```sql
-- Enable RLS on agent tables
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can only see their own runs
CREATE POLICY agent_runs_isolation ON agent_runs
  FOR SELECT
  USING (agent_id = current_setting('app.current_agent_id')::uuid);

-- Policy: Admin users can see all runs
CREATE POLICY agent_runs_admin ON agent_runs
  FOR SELECT
  TO admin_role
  USING (true);
```

## Deployment Checklist

### Pre-Deployment

- [ ] Database migrations tested on staging
- [ ] OPA policies deployed and tested
- [ ] Integration tests passing
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Documentation reviewed

### Deployment Steps

1. **Database**
   ```bash
   # Backup first
   pg_dump -U summit summit > backup_$(date +%Y%m%d).sql

   # Apply migration
   psql -U summit -d summit -f db/migrations/017_agent_framework.sql

   # Verify
   psql -U summit -d summit -c "\dt agents*"
   ```

2. **OPA Policies**
   ```bash
   # Deploy policy
   cp policy/agent/agent_policy.rego /etc/opa/policies/

   # Reload OPA
   curl -X PUT http://localhost:8181/v1/policies/agent \
     --data-binary @policy/agent/agent_policy.rego

   # Test policy
   curl -X POST http://localhost:8181/v1/data/summit/agent/decision \
     -d '{"input": {...}}'
   ```

3. **Service Deployment**
   ```bash
   # Build
   cd services/agent-gateway
   npm install
   npm run build

   # Deploy (example with PM2)
   pm2 start dist/server.js --name agent-gateway

   # Verify
   curl http://localhost:3001/health
   ```

4. **Monitoring**
   ```bash
   # Import Grafana dashboards
   curl -X POST http://grafana:3000/api/dashboards/db \
     -H "Content-Type: application/json" \
     -d @dashboards/agents.json

   # Test alerts
   curl http://localhost:9093/api/v1/alerts
   ```

### Post-Deployment

- [ ] Health check passing
- [ ] Metrics appearing in Prometheus
- [ ] Logs appearing in aggregator
- [ ] Test agent can authenticate
- [ ] Safety scenarios pass
- [ ] Approval workflow works
- [ ] Quotas enforced

## Rollback Plan

If issues occur:

1. **Stop Agent Gateway**
   ```bash
   pm2 stop agent-gateway
   ```

2. **Revert OPA Policies**
   ```bash
   curl -X DELETE http://localhost:8181/v1/policies/agent
   ```

3. **Rollback Database** (if needed)
   ```bash
   psql -U summit summit < backup_YYYYMMDD.sql
   ```

4. **Verify Core Platform**
   ```bash
   # Test existing services
   curl http://localhost:3000/health  # API
   curl http://localhost:8181/health  # OPA
   ```

## Support

- Architecture Questions: architecture@company.com
- Integration Issues: platform-team@company.com
- Security Concerns: security@company.com
