# Agent Fleet Governance Framework

> Misuse-aware orchestration for Summit AI agent fleets with IC FY28 compliance

## Overview

This framework provides comprehensive governance capabilities for AI agent fleets, including:

- **OPA Policy Engine** - Fine-grained policy-based access control
- **Multi-LLM Prompt Chaining** - Governed orchestration across LLM providers
- **Incident Response** - Automated detection, escalation, and mitigation
- **Hallucination Audit** - Detection and remediation of AI hallucinations
- **Auto-Rollback** - Automatic recovery from policy violations
- **SLSA/Cosign Provenance** - Cryptographic provenance for AI artifacts
- **IC FY28 Compliance** - Intelligence Community validation alignment

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Governance Dashboard                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Metrics   │ │   Events    │ │   Health    │ │   Compliance Status     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│                              Core Components                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Policy Engine │  │  Orchestrator │  │   Incident    │  │ Hallucination│ │
│  │     (OPA)     │  │  (Multi-LLM)  │  │   Response    │  │    Audit    │ │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └──────┬──────┘ │
│          │                  │                  │                 │        │
│  ┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐  ┌──────┴──────┐ │
│  │   Rollback    │  │  Provenance   │  │  Compliance   │  │   Event     │ │
│  │   Manager     │  │   Manager     │  │   Validator   │  │   Stream    │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│                           Agent Fleet                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  │ Agent N │  │   ...   │         │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
└───────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { createGovernanceFramework } from '@summit/agent-governance';

// Create governance framework with all components
const governance = createGovernanceFramework({
  policy: {
    opaBaseUrl: 'http://localhost:8181',
    failSafe: 'deny',
  },
  orchestrator: {
    maxConcurrentChains: 10,
    enableHallucinationCheck: true,
  },
  compliance: {
    validationLevel: 'enhanced',
    auditFrequency: 'continuous',
  },
});

// Evaluate policy for an agent action
const decision = await governance.policyEngine.evaluateAction({
  agentId: 'agent-001',
  fleetId: 'fleet-001',
  sessionId: 'session-001',
  trustLevel: 'elevated',
  classification: 'CONFIDENTIAL',
  capabilities: ['read', 'analyze'],
  requestedAction: 'analyze_data',
  targetResource: 'entity:12345',
  userContext: {
    userId: 'user-001',
    roles: ['analyst'],
    clearance: 'SECRET',
    organization: 'org-001',
  },
  environmentContext: {
    timestamp: Date.now(),
    airgapped: false,
    federalEnvironment: true,
    slsaLevel: 'SLSA_3',
  },
});

if (decision.allow) {
  // Proceed with agent action
} else {
  console.log('Action denied:', decision.reason);
}
```

## Components

### Policy Engine

OPA-based policy evaluation with caching, retries, and fail-safe defaults.

```typescript
import { AgentPolicyEngine } from '@summit/agent-governance/policy-engine';

const engine = new AgentPolicyEngine({
  opaBaseUrl: 'http://opa:8181',
  cacheEnabled: true,
  cacheTtlMs: 60_000,
  failSafe: 'deny',
});

// Evaluate different policy types
const actionDecision = await engine.evaluateAction(context);
const misuseDecision = await engine.evaluateMisuse(context);
const chainDecision = await engine.evaluateChain(context, chainMetadata);
```

### Prompt Chain Orchestrator

Multi-LLM orchestration with governance controls:

```typescript
import { PromptChainOrchestrator } from '@summit/agent-governance/orchestration';

const orchestrator = new PromptChainOrchestrator(policyEngine, {
  maxConcurrentChains: 10,
  enableHallucinationCheck: true,
  hallucinationThreshold: 0.7,
});

// Register LLM providers
orchestrator.registerProvider(anthropicAdapter);
orchestrator.registerProvider(openaiAdapter);

// Execute chain
const result = await orchestrator.executeChain({
  chain: myChain,
  inputs: { query: 'Analyze this data' },
  context: agentContext,
});
```

### Incident Response

Automated detection and mitigation:

```typescript
import { IncidentResponseManager } from '@summit/agent-governance/incident-response';

const incidentManager = new IncidentResponseManager({
  autoMitigate: true,
  notificationChannels: [
    { type: 'slack', config: { webhook: '...' }, severityFilter: ['critical'] },
  ],
});

// Report incident
const incident = await incidentManager.reportIncident({
  type: 'policy_violation',
  severity: 'high',
  title: 'Unauthorized access attempt',
  description: 'Agent attempted to access classified data',
  reporter: 'system',
  classification: 'SECRET',
});

// Resolve incident
await incidentManager.resolveIncident(incident.id, {
  resolver: 'admin',
  rootCause: 'Misconfigured trust level',
});
```

### Hallucination Audit

Detection and remediation of AI hallucinations:

```typescript
import { HallucinationAuditor } from '@summit/agent-governance/hallucination-audit';

const auditor = new HallucinationAuditor({
  enabled: true,
  detectionMethods: ['factual_check', 'consistency_check', 'source_verification'],
  autoRemediate: true,
});

const detection = await auditor.audit({
  agentId: 'agent-001',
  sessionId: 'session-001',
  input: 'What is the capital of France?',
  output: 'According to a 2023 study by Dr. Smith...',
  sources: ['Wikipedia: France'],
});

if (detection) {
  console.log('Hallucination detected:', detection.type, detection.severity);
}
```

### Rollback Manager

Automatic recovery from failures:

```typescript
import { RollbackManager } from '@summit/agent-governance/rollback';

const rollbackManager = new RollbackManager({
  triggers: [
    { trigger: 'policy_violation', threshold: 10, window: 300_000, enabled: true },
    { trigger: 'hallucination_threshold', threshold: 5, window: 300_000, enabled: true },
  ],
  autoApprove: false,
});

// Create checkpoint
const checkpoint = await rollbackManager.createCheckpoint({
  scope: 'agent',
  agentId: 'agent-001',
  state: currentAgentState,
  createdBy: 'system',
});

// Initiate rollback when needed
const rollback = await rollbackManager.initiateRollback({
  trigger: 'safety_breach',
  scope: 'agent',
  agentId: 'agent-001',
  reason: 'Safety threshold exceeded',
  initiatedBy: 'system',
});
```

### AI Provenance Manager

SLSA/cosign provenance for AI artifacts:

```typescript
import { AIProvenanceManager } from '@summit/agent-governance/provenance';

const provenanceManager = new AIProvenanceManager({
  signProvenance: true,
  requireSlsa3: true,
});

// Create provenance for output
const provenance = await provenanceManager.createOutputProvenance({
  output: llmResponse,
  promptHash: promptDigest,
  modelId: 'claude-3',
  agentId: 'agent-001',
  sessionId: 'session-001',
  temperature: 0.7,
  maxTokens: 1000,
});

// Verify provenance
const verification = await provenanceManager.verifyProvenance(provenance.id);
console.log('SLSA Level:', verification.slsaLevel);
```

### IC FY28 Compliance

Intelligence Community compliance validation:

```typescript
import { ICFY28ComplianceValidator } from '@summit/agent-governance/compliance';

const validator = new ICFY28ComplianceValidator(config, dependencies);

// Run full validation
const result = await validator.validate();
console.log('Compliant:', result.overallCompliant);
console.log('Controls:', result.controls.length);
console.log('Findings:', result.findings.length);

// Get compliance score
const score = validator.getComplianceScore();
console.log('Score:', score.score, '%');
console.log('Trend:', score.trend);
```

## Explicit Tradeoffs

This framework makes explicit tradeoffs between **safety** and **velocity**:

### Safety-First Design (+Safety / -Velocity)

| Decision | Safety Benefit | Velocity Cost |
|----------|---------------|---------------|
| **Fail-safe deny** | Prevents unauthorized access during outages | May block legitimate requests when OPA unavailable |
| **Mandatory policy evaluation** | Every action is authorized | Adds ~5-50ms latency per request |
| **Hallucination checking** | Catches fabricated content | Adds processing time to each output |
| **SLSA-3 requirement** | Verified supply chain | Requires additional build infrastructure |
| **Auto-rollback** | Quick recovery from issues | May cause service disruption |
| **Classification enforcement** | Data protection | Limits cross-team collaboration |

### When to Relax Constraints

For **development environments**, consider:
```typescript
createGovernanceFramework({
  policy: { failSafe: 'allow', cacheEnabled: false },
  orchestrator: { enableHallucinationCheck: false },
  compliance: { enabled: false },
});
```

For **high-throughput scenarios**, consider:
```typescript
createGovernanceFramework({
  policy: { cacheTtlMs: 300_000 }, // Longer cache
  orchestrator: { hallucinationThreshold: 0.9 }, // Higher threshold
});
```

### Recommended Production Settings

```typescript
createGovernanceFramework({
  policy: {
    failSafe: 'deny',
    cacheEnabled: true,
    cacheTtlMs: 60_000,
    federalMode: true,
  },
  orchestrator: {
    enableHallucinationCheck: true,
    hallucinationThreshold: 0.7,
    enableProvenance: true,
  },
  compliance: {
    validationLevel: 'full',
    auditFrequency: 'continuous',
  },
});
```

## IC FY28 Controls

The framework implements these IC FY28 control categories:

| Category | Controls | Status |
|----------|----------|--------|
| **Identity** | IC-AI-001, IC-AI-002 | Agent identity, trust levels |
| **Access** | IC-AI-010, IC-AI-011 | Policy-based access, classification |
| **Data** | IC-AI-020, IC-AI-021 | Provenance, retention |
| **Audit** | IC-AI-030, IC-AI-031 | Logging, incident response |
| **Supply Chain** | IC-AI-040, IC-AI-041 | SLSA-3, chain integrity |
| **AI Safety** | IC-AI-050-053 | Hallucination, misuse, boundaries, oversight |

## OPA Policy Deployment

Deploy the included Rego policies to your OPA instance:

```bash
# Load agent governance policies
opa run --server \
  --bundle ./policies \
  --addr :8181
```

The policy package `agents.governance` provides:
- `action_allowed` - Main action authorization
- `chain_allowed` - Prompt chain authorization
- `provenance_valid` - Provenance verification
- `misuse_detected` - Misuse pattern detection
- `icfy28_compliant` - Compliance validation

## Dashboard Integration

The `GovernanceDashboardService` provides metrics for UI integration:

```typescript
const dashboard = governance.dashboard;

// Get comprehensive metrics
const metrics = await dashboard.getMetrics();

// Get health status
const health = await dashboard.getHealthStatus();

// Get recent events
const events = dashboard.getRecentEvents(100);

// Get summary for display
const summary = await dashboard.getSummary();
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Contributing

1. Follow existing patterns in the codebase
2. Add tests for new functionality
3. Update documentation
4. Ensure IC FY28 compliance for new controls

## License

MIT
