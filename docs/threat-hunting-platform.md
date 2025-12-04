# Threat Hunting Platform

> **Agentic Hunt Queries over Knowledge Graph with Auto-Remediation**

## Overview

The Threat Hunting Platform provides an intelligent, LLM-powered system for proactive threat detection across the IntelGraph knowledge graph. It orchestrates agentic hunt queries, correlates findings with CTI/OSINT sources, and enables automated remediation with safety controls.

### Key Features

- **Agentic Hypothesis Generation**: LLM-driven threat hypothesis generation based on current threat landscape
- **Cypher Template Engine**: Pre-built, validated query templates for common threat patterns
- **91% Precision Target**: High-precision findings to minimize false positives
- **CTI/OSINT Integration**: Automatic enrichment from MISP, OTX, VirusTotal, Shodan, and more
- **Auto-Remediation**: Configurable automated response with approval workflows
- **Real-time UI**: Live dashboard for monitoring hunts and managing findings

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Threat Hunting Platform                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   LLM Chain  │───▶│   Cypher     │───▶│   Neo4j      │      │
│  │   Executor   │    │   Templates  │    │   Graph      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                        │               │
│         ▼                                        ▼               │
│  ┌──────────────┐                        ┌──────────────┐       │
│  │  Hypothesis  │                        │   Query      │       │
│  │  Generation  │                        │   Results    │       │
│  └──────────────┘                        └──────────────┘       │
│         │                                        │               │
│         └────────────────┬───────────────────────┘               │
│                          ▼                                       │
│                   ┌──────────────┐                              │
│                   │   Result     │                              │
│                   │   Analysis   │                              │
│                   └──────────────┘                              │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   CTI/OSINT  │ │   Finding    │ │   Auto       │            │
│  │   Enrichment │ │   Scoring    │ │   Remediation│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- Neo4j 5.x with graph data
- Redis for workflow state
- LLM API access (Claude, GPT-4, etc.)

### Quick Start

```typescript
import { threatHuntingOrchestrator } from './hunting';

// Initialize the orchestrator
await threatHuntingOrchestrator.initialize();

// Start a hunt
const { huntId } = await threatHuntingOrchestrator.startHunt({
  scope: 'all',
  timeWindowHours: 24,
  configuration: {
    autoRemediate: false,
    confidenceThreshold: 0.7,
    targetPrecision: 0.91,
  },
});

// Monitor progress
const status = await threatHuntingOrchestrator.getHuntStatus(huntId);
console.log(`Progress: ${status.progress}%`);

// Get results
const results = await threatHuntingOrchestrator.getHuntResults(huntId);
console.log(`Findings: ${results.findings.length}`);
```

## Configuration

### Hunt Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scope` | string | `'all'` | Hunt scope: `all`, `network`, `endpoint`, `identity`, `cloud` |
| `timeWindowHours` | number | `24` | Time window for historical analysis |
| `autoRemediate` | boolean | `false` | Enable automatic remediation |
| `remediationApprovalRequired` | boolean | `true` | Require approval for remediation actions |
| `confidenceThreshold` | number | `0.7` | Minimum confidence for findings |
| `targetPrecision` | number | `0.91` | Target precision rate |
| `llmModel` | string | `'claude-3-opus'` | LLM model for analysis |
| `llmTemperature` | number | `0.1` | LLM temperature (lower = more deterministic) |

### Environment Variables

```bash
# LLM Configuration
LLM_API_KEY=your-api-key
LLM_MODEL=claude-3-opus

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# CTI Sources
MISP_URL=https://misp.local
MISP_API_KEY=your-key
VIRUSTOTAL_API_KEY=your-key
OTX_API_KEY=your-key
SHODAN_API_KEY=your-key
```

## Cypher Templates

### Available Template Categories

1. **Lateral Movement** - Detect multi-hop network traversal
2. **Credential Access** - Identify credential spraying/stuffing
3. **Data Exfiltration** - Find data staging and exfil patterns
4. **Persistence** - Discover persistence mechanisms
5. **Command & Control** - Detect C2 beaconing patterns
6. **Insider Threat** - Identify insider threat indicators
7. **IOC Hunting** - Search for known indicators

### Custom Templates

Add custom templates to `workflows/hunting/cypher-templates/`:

```cypher
// Template: custom_detection
// Description: Custom detection pattern
// Parameters: $param1, $param2
MATCH (source:Entity)-[r:RELATIONSHIP]->(target:Entity)
WHERE r.timestamp > datetime() - duration({hours: $param1})
RETURN source, r, target
LIMIT $param2
```

## LLM Chaining

The platform uses a multi-stage LLM chain:

### 1. Hypothesis Generation

```typescript
// Input: Current threat context, alerts, anomalies
// Output: Prioritized list of testable hypotheses

{
  hypotheses: [
    {
      id: "hypothesis-1",
      statement: "Detect lateral movement via RDP...",
      mitreAttackTechniques: [{ id: "T1021.001", ... }],
      requiredQueryTemplate: "lateral_movement_chain",
      expectedIndicators: ["RDP connections", ...],
      confidenceLevel: 0.85,
      priority: 1
    }
  ]
}
```

### 2. Query Generation

```typescript
// Input: Hypotheses, graph schema
// Output: Validated Cypher queries

{
  queries: [
    {
      id: "query-1",
      hypothesisId: "hypothesis-1",
      query: "MATCH (source)-[:CONNECTED_TO*1..3]->(target)...",
      params: { max_hops: 3, time_window_hours: 24 },
      estimatedComplexity: 30
    }
  ]
}
```

### 3. Result Analysis

```typescript
// Input: Query results, hypotheses, baseline
// Output: Classified findings with remediation recommendations

{
  findings: [
    {
      id: "finding-1",
      severity: "HIGH",
      confidence: 0.88,
      classification: "LATERAL_MOVEMENT",
      entitiesInvolved: [...],
      iocsIdentified: [...],
      ttpsMatched: [...],
      recommendedActions: [...]
    }
  ],
  precisionEstimate: 0.91
}
```

## Auto-Remediation

### Supported Actions

| Action Type | Description | Reversible |
|-------------|-------------|------------|
| `BLOCK_IP` | Block IP at firewall | ✓ |
| `BLOCK_DOMAIN` | Add domain to DNS sinkhole | ✓ |
| `QUARANTINE_FILE` | Quarantine file across endpoints | ✓ |
| `DISABLE_ACCOUNT` | Disable user account | ✓ |
| `ISOLATE_HOST` | Network isolate host | ✓ |
| `KILL_PROCESS` | Terminate malicious process | ✗ |
| `REVOKE_CREDENTIALS` | Revoke credentials/tokens | ✓ |
| `ALERT_TEAM` | Send alert to security team | ✗ |
| `CREATE_TICKET` | Create incident ticket | ✗ |

### Safety Controls

1. **Confidence Threshold**: Actions only execute above configured confidence
2. **Approval Workflow**: High-impact actions require manual approval
3. **Rate Limiting**: Maximum 10 actions per minute
4. **Critical Asset Protection**: Critical infrastructure requires explicit approval
5. **Rollback Support**: Most actions can be rolled back

### Remediation Hooks

```typescript
// Pre-remediation hook
autoRemediationHooks.registerHook({
  name: 'custom_validation',
  type: 'pre',
  actionTypes: ['ISOLATE_HOST'],
  handler: async (action, context) => {
    // Custom validation logic
    if (action.target.criticality === 'CRITICAL') {
      return { proceed: false, message: 'Requires manual approval' };
    }
    return { proceed: true };
  }
});

// Post-remediation hook
autoRemediationHooks.registerHook({
  name: 'notify_soc',
  type: 'post',
  actionTypes: ['BLOCK_IP', 'ISOLATE_HOST'],
  handler: async (action, context) => {
    await notifySOC(action, context);
    return { proceed: true };
  }
});
```

## CTI/OSINT Integration

### Supported Sources

| Source | Type | Data |
|--------|------|------|
| MISP | CTI | Threat events, IOCs |
| AlienVault OTX | CTI | Threat pulses, IOCs |
| VirusTotal | CTI | File/URL analysis |
| Shodan | OSINT | Internet scanning data |
| Censys | OSINT | Certificate/host data |
| Pastebin | OSINT | Paste monitoring |
| GitHub | OSINT | Code/leak monitoring |

### Enrichment Flow

```
Finding → Extract IOCs → Query CTI Sources →
  → Match Threat Actors → Associate Campaigns →
  → Calculate Enriched Confidence → Return Enriched Finding
```

## UI Components

### ThreatHuntingDashboard

Main dashboard for hunt orchestration:

```tsx
import { ThreatHuntingDashboard } from '@/components/hunting';

function App() {
  return <ThreatHuntingDashboard />;
}
```

Features:
- Start/stop hunts
- Real-time progress tracking
- Findings browser with severity filters
- IOC table with export
- Remediation management
- Report generation

### HuntQueryBuilder

Visual query builder for custom hunts:

```tsx
import { HuntQueryBuilder } from '@/components/hunting';

function CustomHuntPage() {
  return <HuntQueryBuilder />;
}
```

Features:
- Template browser by category
- Parameter configuration
- Hypothesis builder with MITRE mapping
- Query editor with syntax highlighting
- Live query execution

## API Reference

### REST Endpoints

```
POST /api/v1/hunt/start
  - Start a new threat hunt
  - Body: StartHuntRequest
  - Returns: StartHuntResponse

GET /api/v1/hunt/:huntId/status
  - Get hunt status
  - Returns: HuntStatusResponse

GET /api/v1/hunt/:huntId/results
  - Get hunt results
  - Returns: HuntResultsResponse

POST /api/v1/hunt/:huntId/cancel
  - Cancel a running hunt

POST /api/v1/hunt/query
  - Execute a custom query
  - Body: { query: string, params?: object }

GET /api/v1/hunt/templates
  - List available query templates

POST /api/v1/remediation/:planId/approve
  - Approve a remediation plan
  - Body: { approver: string }

POST /api/v1/remediation/:planId/execute
  - Execute an approved plan

POST /api/v1/remediation/:planId/rollback
  - Rollback a remediation plan
```

## Metrics & Observability

### Key Metrics

| Metric | Description |
|--------|-------------|
| `threat_hunt_findings_total` | Total findings discovered |
| `threat_hunt_precision` | Precision estimate per hunt |
| `threat_hunt_duration_seconds` | Hunt execution duration |
| `threat_hunt_remediation_count` | Remediation actions executed |
| `llm_tokens_used_total` | Total LLM tokens consumed |

### Prometheus Labels

```yaml
threat_hunt_findings_total{severity="HIGH", classification="LATERAL_MOVEMENT"}
threat_hunt_precision{hunt_id="abc123"}
threat_hunt_duration_seconds{hunt_type="agentic"}
```

## Trade-offs

| Advantage | Trade-off |
|-----------|-----------|
| **Proactive Detection** | +Compute cost for LLM inference |
| **High Precision (91%)** | May miss some edge cases |
| **Auto-Remediation** | Requires careful tuning to avoid disruption |
| **CTI Enrichment** | API rate limits on external sources |
| **Real-time Dashboard** | WebSocket connection overhead |

## Best Practices

1. **Start Conservative**: Begin with `autoRemediate: false` and review findings manually
2. **Tune Confidence**: Adjust `confidenceThreshold` based on false positive rate
3. **Scope Appropriately**: Use focused scopes (`network`, `endpoint`) for targeted hunts
4. **Review Templates**: Customize Cypher templates for your environment
5. **Monitor Precision**: Track `precisionEstimate` and adjust if below 85%
6. **Rate Limit CTI**: Configure API limits to avoid quota exhaustion
7. **Approval for Critical**: Always require approval for critical infrastructure

## Troubleshooting

### Common Issues

**Hunt stuck in "executing_queries"**
- Check Neo4j connectivity
- Verify query timeout settings
- Review query complexity limits

**Low precision estimate**
- Increase confidence threshold
- Add more specific hypothesis constraints
- Review and tune Cypher templates

**CTI enrichment failing**
- Verify API keys are configured
- Check network connectivity to external sources
- Review rate limits

**Remediation not executing**
- Check approval queue for pending approvals
- Verify target criticality settings
- Review pre-hook validation logs

## Version History

- **v1.0.0** (2024-01): Initial release
  - Agentic hypothesis generation
  - Cypher template engine
  - CTI/OSINT enrichment
  - Auto-remediation with approval workflow
  - React dashboard

## Support

For issues and feature requests, see:
- Documentation: `/docs/threat-hunting-platform.md`
- Issues: `https://github.com/BrianCLong/summit/issues`
- Runbooks: `/RUNBOOKS/threat-hunting.md`
