# Agent Archetypes

**Named, opinionated AI agents for Summit's Company OS**

## Overview

Agent Archetypes are pre-built, specialized AI agents that automate operational work while respecting governance policies. Unlike generic AI assistants, each archetype is tailored for a specific business role with domain-specific capabilities.

## Available Agents

### 🎯 AI Chief of Staff
**Role:** Personal AI assistant for leaders

**Capabilities:**
- Inbox triage and prioritization
- Meeting preparation with auto-generated pre-reads
- Follow-up tracking (action items from meetings)
- Decision support and synthesis
- Calendar optimization
- Delegation recommendations

**Use Cases:**
- Morning briefings synthesizing priorities
- Pre-meeting context and talking points
- Automated action item extraction
- Executive dashboard

### 🏭 AI COO (Chief Operating Officer)
**Role:** Operations AI for SLAs, incidents, approvals

**Capabilities:**
- SLA monitoring with burn rate prediction
- Incident triage and routing
- Approval queue management and escalation
- Process drift detection
- Resource utilization tracking
- Operational metrics dashboards

**Use Cases:**
- Real-time ops health monitoring
- Automated incident response
- Approval bottleneck resolution
- Process compliance checking

### 📈 AI RevOps (Revenue Operations)
**Role:** Revenue AI for pipeline, forecast, churn

**Capabilities:**
- Pipeline sanity checks and health scoring
- Forecast variance analysis
- Churn risk prediction
- Lead scoring and prioritization
- Multi-touch attribution modeling
- Revenue analytics

**Use Cases:**
- Pipeline cleanup automation
- Forecast accuracy improvement
- At-risk account identification
- Revenue performance insights

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AgentRegistry                         │
│  (Singleton managing all agent instances)               │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Chief   │ │   COO    │ │ RevOps   │
│ of Staff │ │  Agent   │ │  Agent   │
│  Agent   │ │          │ │          │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Graph   │ │  Policy  │ │ Approval │
│   Core   │ │  Engine  │ │  Engine  │
│ (Neo4j)  │ │  (OPA)   │ │          │
└──────────┘ └──────────┘ └──────────┘
         │        │        │
         └────────┼────────┘
                  ▼
         ┌────────────────┐
         │  Audit Trail   │
         └────────────────┘
```

## Quick Start

### 1. Initialize Agents

```typescript
import { initializeAgentArchetypes } from './agents/archetypes';

// Initialize all agents
const registry = await initializeAgentArchetypes();

console.log('Agents ready:', registry.listAgents());
```

### 2. Execute an Agent

```typescript
import { getAgentRegistry } from './agents/archetypes';
import { AgentContext } from './agents/archetypes/base/types';

const registry = getAgentRegistry();

// Create context
const context: AgentContext = {
  user: {
    id: 'user_123',
    name: 'Alice',
    email: 'alice@example.com',
    roles: ['executive'],
    permissions: ['read:calendar', 'read:email', 'create:task'],
  },
  organization: {
    id: 'org_456',
    name: 'Example Corp',
    policies: { id: 'policy_789', version: '1.0', rules: [] },
    graphHandle: graphHandle, // Your Neo4j graph handle
  },
  mode: 'analysis',
  timestamp: new Date(),
  requestId: 'req_abc123',
  classification: 'CONFIDENTIAL',
};

// Execute Chief of Staff agent (morning briefing)
const result = await registry.execute('chief_of_staff', context);

console.log('Briefing:', result.data.briefing);
```

### 3. Get Agent Status

```typescript
import { getAgentRegistry } from './agents/archetypes';

const registry = getAgentRegistry();

// Get status of all agents
const statusMap = registry.getStatusAll();

statusMap.forEach((status, role) => {
  console.log(`${role}: ${status.status} (last active: ${status.lastActive})`);
});

// Health check
const healthMap = await registry.getHealthAll();

healthMap.forEach((health, role) => {
  console.log(`${role}: ${health.healthy ? 'healthy' : 'unhealthy'}`);
});
```

## Usage Examples

### Chief of Staff: Morning Briefing

```typescript
const result = await registry.execute('chief_of_staff', {
  ...context,
  mode: 'analysis',
});

// result.data.briefing contains:
// - topPriorities: Top 5 priorities for the day
// - meetingReadiness: Next meeting prep status
// - inboxSummary: Urgent/high/low priority counts
// - actionItems: Overdue action items
```

### COO: Ops Status

```typescript
const result = await registry.execute('coo', {
  ...context,
  mode: 'monitor',
});

// result.data.operationalStatus contains:
// - slaCompliance: SLA burn rate and at-risk SLAs
// - activeIncidents: P0/P1/P2 incidents
// - approvalBottlenecks: Stale approvals
// - processHealth: Drift score and compliance
```

### RevOps: Pipeline Health

```typescript
const result = await registry.execute('revops', {
  ...context,
  mode: 'analysis',
});

// result.data contains:
// - pipelineHealth: Health score and issues
// - forecastVariance: Week-over-week delta
// - churnRisks: At-risk accounts by ARR
```

## Policy Enforcement

All agent actions are evaluated by the OPA policy engine before execution.

**Policy File:** `/policies/agent-archetypes.rego`

### Example Policies:

```rego
# Chief of Staff can read user's calendar
allow_chief_of_staff_read {
    input.agent.role == "chief_of_staff"
    input.action == "read"
    input.resource.type == "calendar"
    input.resource.owner_id == input.user.id
}

# COO requires approval for critical incidents
require_approval_coo_critical {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity in ["P0", "P1"]
}

# RevOps cannot modify opportunities
deny_revops_modify_opportunity {
    input.agent.role == "revops"
    input.action in ["create", "update", "delete"]
    input.resource.type == "opportunity"
}
```

## Audit Trail

Every agent action creates an immutable audit log:

```typescript
interface AuditRecord {
  id: string;
  timestamp: Date;
  requestId: string;
  agentType: AgentRole;
  action: string;
  input: any;
  output: any;
  policyResult: PolicyResult;
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  userId: string;
  organizationId: string;
  classification: ClassificationLevel;
}
```

## Extending with Custom Agents

### 1. Create Agent Class

```typescript
import { BaseAgentArchetype } from './base/BaseAgentArchetype';
import { AgentContext, AgentQuery, AgentAnalysis, ... } from './base/types';

export class CustomAgent extends BaseAgentArchetype {
  constructor() {
    super(
      'My Custom Agent',
      'custom' as AgentRole,
      ['capability1', 'capability2']
    );
  }

  async initialize(): Promise<void> {
    // Setup logic
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Main execution logic
  }

  async analyze(query: AgentQuery, context: AgentContext): Promise<AgentAnalysis> {
    // Analysis logic
  }

  async recommend(analysis: AgentAnalysis, context: AgentContext): Promise<AgentRecommendation[]> {
    // Recommendation logic
  }

  async act(recommendation: AgentRecommendation, context: AgentContext): Promise<AgentAction> {
    // Action execution logic
  }

  async shutdown(): Promise<void> {
    // Cleanup logic
  }
}
```

### 2. Register Agent

```typescript
import { getAgentRegistry } from './agents/archetypes';
import { CustomAgent } from './agents/archetypes/custom/CustomAgent';

const registry = getAgentRegistry();
const customAgent = new CustomAgent();

registry.register(customAgent);
await customAgent.initialize();
```

### 3. Define Policies

Add policies to `/policies/agent-archetypes.rego`:

```rego
allow_custom_agent_read {
    input.agent.role == "custom"
    input.action == "read"
    input.resource.type in ["allowed_types"]
}
```

## Integration with Switchboard

Agents integrate with Summit's Switchboard UI via the command palette (⌘K):

```
⌘K → "Brief me"           → Chief of Staff morning briefing
⌘K → "Ops status"          → COO operational dashboard
⌘K → "Pipeline health"     → RevOps pipeline analysis
⌘K → "Triage incident"     → COO incident creation
⌘K → "Show follow-ups"     → Chief of Staff action items
```

**Implementation:**
```typescript
// In Switchboard component
import { getAgentRegistry } from '@/agents/archetypes';

const handleCommand = async (command: string) => {
  const registry = getAgentRegistry();

  const commandMap = {
    'brief me': { agent: 'chief_of_staff', mode: 'analysis' },
    'ops status': { agent: 'coo', mode: 'monitor' },
    'pipeline health': { agent: 'revops', mode: 'analysis' },
  };

  const { agent, mode } = commandMap[command];
  const result = await registry.execute(agent, { ...context, mode });

  // Render result in Switchboard
  renderAgentResult(result);
};
```

## Testing

### Unit Tests

```typescript
import { ChiefOfStaffAgent } from './chief-of-staff/ChiefOfStaffAgent';

describe('ChiefOfStaffAgent', () => {
  it('should triage inbox messages', async () => {
    const agent = new ChiefOfStaffAgent();
    await agent.initialize();

    const result = await agent.execute(mockContext);

    expect(result.success).toBe(true);
    expect(result.data.briefing.inboxSummary).toBeDefined();
  });
});
```

### Integration Tests

```typescript
import { initializeAgentArchetypes } from './index';

describe('Agent Integration', () => {
  it('should execute all agents successfully', async () => {
    const registry = await initializeAgentArchetypes();

    const agents = ['chief_of_staff', 'coo', 'revops'];

    for (const agent of agents) {
      const result = await registry.execute(agent, mockContext);
      expect(result.success).toBe(true);
    }
  });
});
```

## Performance

**Benchmarks (typical workload):**

| Agent | p50 | p95 | p99 |
|-------|-----|-----|-----|
| Chief of Staff | 150ms | 300ms | 500ms |
| COO | 200ms | 400ms | 600ms |
| RevOps | 250ms | 500ms | 800ms |

**Optimization Tips:**
- Cache graph queries (Redis)
- Parallelize independent operations
- Use read replicas for heavy analysis
- Pre-compute common insights

## Monitoring

**Metrics to Track:**
```typescript
interface AgentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  actionsExecuted: number;
  approvalsRequired: number;
  policyViolations: number;
}
```

**Dashboards:**
- Agent request rate
- Agent success rate
- Agent latency (p50/p95/p99)
- Policy violations by agent
- Approval queue length

## Roadmap

### Q4 2025 (Launched)
- ✅ AI Chief of Staff
- ✅ AI COO
- ✅ AI RevOps
- ✅ Policy engine integration
- ✅ Audit trail

### Q1 2026
- [ ] AI CFO (budget, spend, forecasting)
- [ ] AI CISO (security, compliance, threats)
- [ ] LLM provider abstraction (OpenAI, Anthropic, Azure OpenAI)
- [ ] Agent learning from feedback

### Q2 2026
- [ ] AI People Ops (hiring, performance, engagement)
- [ ] AI Product Manager (features, roadmap, analytics)
- [ ] Custom agent marketplace
- [ ] Agent collaboration (multi-agent workflows)

### Q3 2026
- [ ] Fine-tuned models per agent
- [ ] RAG (Retrieval-Augmented Generation)
- [ ] Agent autonomy levels (supervised → autonomous)
- [ ] Cross-org benchmarking

## Support

**Documentation:** [docs.summit.com/agents](https://docs.summit.com/agents)
**API Reference:** [docs.summit.com/api/agents](https://docs.summit.com/api/agents)
**Examples:** [github.com/summitco/examples/agents](https://github.com/summitco/examples/agents)
**Community:** [community.summit.com](https://community.summit.com)

**Contact:**
- Technical Support: [support@summit.com](mailto:support@summit.com)
- Feature Requests: [GitHub Issues](https://github.com/summitco/summit/issues)

---

## License

Copyright © 2025 Summit. All rights reserved.

See [LICENSE](../../../LICENSE) for details.
