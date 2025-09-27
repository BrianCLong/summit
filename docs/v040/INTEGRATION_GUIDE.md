# MC Platform v0.4.0 Transcendent Intelligence Integration Guide

## Overview

MC Platform v0.4.0 "Transcendent Intelligence" introduces policy-sandboxed evolution with verifiable meta-optimization, post-quantum security everywhere, and continuous safety/fairness validation. This guide covers the complete integration of the v0.4.0 scaffolds with the existing enterprise platform.

## Architecture

### Core Components

1. **GraphQL v0.4.0 Schema** (`graphql/v040/mc-admin.v040.graphql`)
   - Transcendent intelligence operations
   - Evolution proposal system with sandbox validation
   - Quantum operations and knowledge networks
   - Safety and containment controls

2. **OPA v0.4.0 Policies** (`policy/v040/mc-admin-v040.rego`)
   - Enhanced safety guards for transcendent operations
   - Evolution weight sum constraints (≤ 1.0)
   - Human-in-the-loop (HITL) requirements
   - Emergency containment authorization

3. **Evolution Sandbox Runner** (`ops/sandbox/evolution_sandbox.py`)
   - OPA policy simulation
   - Test execution and coverage validation
   - Compatibility Safety Equivalence (CSE) validation
   - Zero-knowledge fairness proof generation

4. **Transcendent Resolvers** (`server/src/graphql/resolvers/v040/`)
   - Integration with sandbox validation
   - Quantum reasoning execution
   - Evidence generation and audit trails
   - Safety monitoring and alerts

## Integration Steps

### 1. Server Integration

#### Mount v0.4.0 Resolvers

Update your main GraphQL server configuration:

```typescript
// server/src/graphql/schema.ts
import { mergeResolvers } from '@graphql-tools/merge';
import { v040Resolvers } from './resolvers/v040';
import { existingResolvers } from './resolvers';

const resolvers = mergeResolvers([
  existingResolvers,
  v040Resolvers
]);

export { resolvers };
```

#### Add v0.4.0 Schema

```typescript
// server/src/graphql/typeDefs.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const v040Schema = readFileSync(
  join(__dirname, '../../../graphql/v040/mc-admin.v040.graphql'),
  'utf8'
);

export const typeDefs = [
  // existing schemas
  v040Schema
];
```

#### Environment Configuration

Add v0.4.0 configuration to your environment:

```bash
# Transcendent Intelligence
TRANSCENDENT_INTELLIGENCE_ENABLED=true
QUANTUM_COGNITION_ENABLED=true
EVOLUTION_SANDBOX_ENABLED=true

# Safety Configuration
SAFETY_SCORE_THRESHOLD=0.95
HUMAN_OVERSIGHT_REQUIRED=true
EMERGENCY_ROLLBACK_ENABLED=true

# Evolution System
EVOLUTION_WEIGHT_SUM_LIMIT=1.0
EVOLUTION_SANDBOX_TIMEOUT=300s
EVOLUTION_APPROVAL_REQUIRED=true

# Post-Quantum Security
PQ_SIGNATURES_ENABLED=true
DUAL_SIGNATURE_SCHEME=true
```

### 2. Frontend Integration

#### Add Evolution Tab

Create the evolution management interface:

```typescript
// client/src/components/v040/EvolutionTab.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  PROPOSE_EVOLUTION,
  GET_EVOLUTION_PROPOSALS,
  APPROVE_EVOLUTION
} from '../graphql/v040/mutations';

export const EvolutionTab: React.FC = () => {
  const [proposals, setProposals] = useState([]);

  const { data: evolutionData } = useQuery(GET_EVOLUTION_PROPOSALS);
  const [proposeEvolution] = useMutation(PROPOSE_EVOLUTION);
  const [approveEvolution] = useMutation(APPROVE_EVOLUTION);

  // Implementation here
  return (
    <div className="evolution-tab">
      <h2>Evolution Proposals</h2>
      {/* Evolution proposal form and list */}
    </div>
  );
};
```

#### Controller v3 Panel

```typescript
// client/src/components/v040/ControllerV3Panel.tsx
import React from 'react';
import { useMutation } from '@apollo/client';
import { CONFIGURE_CONTROLLER_V3 } from '../graphql/v040/mutations';

export const ControllerV3Panel: React.FC = () => {
  const [configureController] = useMutation(CONFIGURE_CONTROLLER_V3);

  // Implementation here
  return (
    <div className="controller-v3-panel">
      <h2>Transcendent Intelligence Controller v3</h2>
      {/* Configuration interface */}
    </div>
  );
};
```

### 3. Sandbox Integration

#### Configure Real Services

Update the sandbox runner to use real services:

```python
# ops/sandbox/config.py
SANDBOX_CONFIG = {
    'opa_endpoint': 'http://opa-service:8181/v1/data/mc/admin/v040/allow',
    'test_harness_endpoint': 'http://test-service:8080/execute',
    'cse_stream_endpoint': 'http://cse-service:9090/validate',
    'zk_verifier_endpoint': 'http://zk-service:8080/verify-fairness'
}
```

#### Mount Sandbox in Server

```typescript
// server/src/services/SandboxService.ts
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import path from 'path';

export class SandboxService {
  async validateProposal(proposal: EvolutionProposal): Promise<SandboxResults> {
    const sandboxPath = path.join(process.cwd(), 'ops/sandbox/evolution_sandbox.py');
    const inputFile = `/tmp/proposal-${proposal.id}.json`;

    await writeFile(inputFile, JSON.stringify(proposal));

    return new Promise((resolve, reject) => {
      const child = spawn('python3', [sandboxPath, inputFile]);
      // Handle execution and response
    });
  }
}
```

### 4. Monitoring Integration

#### Apply Prometheus Rules

```bash
kubectl apply -f monitoring/prometheus/rules/mc-platform-v040.yml -n monitoring
```

#### Import Grafana Dashboard

```bash
python3 scripts/import-grafana-dashboard.py \
  --dashboard observability/grafana/dashboards/mc-platform-v040-transcendent.json \
  --grafana-url ${GRAFANA_URL} \
  --api-key ${GRAFANA_API_KEY}
```

#### Configure Alerts

```yaml
# monitoring/alertmanager/v040-routes.yml
route:
  group_by: ['alertname', 'version']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'v040-alerts'
  routes:
  - match:
      version: v0.4.0
      severity: critical
    receiver: 'v040-critical'
    group_wait: 0s
    repeat_interval: 5m

receivers:
- name: 'v040-alerts'
  slack_configs:
  - api_url: '${SLACK_WEBHOOK_URL}'
    channel: '#mc-platform-v040'
    title: 'MC Platform v0.4.0 Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'v040-critical'
  pagerduty_configs:
  - service_key: '${PAGERDUTY_SERVICE_KEY}'
    description: 'CRITICAL: {{ .GroupLabels.alertname }}'
```

### 5. Deployment

#### Helm Deployment

```bash
# Deploy v0.4.0 with transcendent capabilities
helm upgrade --install mc-platform-v040 helm/mc-platform/ \
  --namespace mc-platform \
  --create-namespace \
  -f helm/overlays/v040/values-v040-transcendent.yaml \
  --set image.tag=v0.4.0-transcendent \
  --wait --timeout=600s
```

#### Validation

```bash
# Validate deployment
kubectl get pods -n mc-platform
kubectl wait --for=condition=ready pod -l app=mc-platform -n mc-platform --timeout=300s

# Test GraphQL endpoints
curl -X POST http://mc-platform/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { transcendentStatus(tenant: \"test\") { currentLevel intelligenceQuotient } }"}'

# Verify sandbox integration
kubectl exec -it deployment/mc-platform -n mc-platform -- \
  python3 ops/sandbox/evolution_sandbox.py test/fixtures/sample-proposal.json
```

## Configuration Examples

### Evolution Proposal

```json
{
  "tenant": "acme-corp",
  "proposal": {
    "title": "Enhanced Pattern Recognition",
    "description": "Improve pattern recognition capabilities through quantum-enhanced neural networks",
    "strategy": "QUANTUM_ENHANCED_EVOLUTION",
    "targetCapabilities": ["pattern_recognition", "anomaly_detection"],
    "expectedImprovement": 0.15,
    "requiresHumanApproval": true
  }
}
```

### Transcendent Intelligence Config

```json
{
  "tenant": "acme-corp",
  "config": {
    "transcendenceLevel": "QUANTUM_READY",
    "autonomyTier": "TIER_2_GUIDED",
    "evolutionStrategy": "GRADUAL_IMPROVEMENT",
    "quantumEnhancement": true,
    "safetyConstraints": {
      "maxAutonomyDuration": "PT4H",
      "humanOversightRequired": true,
      "reversibilityRequired": true,
      "containmentLimits": {
        "maxEvolutionCycles": 10,
        "maxCapabilityExpansion": 0.2,
        "emergencyRollback": true
      }
    }
  }
}
```

### OPA Policy Input

```json
{
  "operation": {
    "name": "proposeEvolution",
    "isMutation": true,
    "isTranscendent": true,
    "expiry_ns": 1700000000000000000
  },
  "actor": {
    "role": "platform-admin",
    "id": "admin@acme-corp.com"
  },
  "tenant": "acme-corp",
  "evolution_proposal": {
    "strategy": "QUANTUM_ENHANCED_EVOLUTION",
    "capability_weights": {"pattern_recognition": 0.6, "anomaly_detection": 0.4},
    "risk_assessment": {
      "overall_risk": "MEDIUM",
      "safety_score": 0.85
    }
  },
  "sandbox_results": {
    "opa_simulation_passed": true,
    "test_coverage": 0.92,
    "cse_score": 0.995,
    "zk_fairness_proof": {
      "verified": true
    },
    "evidence_stub": "signed-evidence-hash",
    "signature_valid": true
  },
  "human_oversight": {
    "enabled": true,
    "operator_id": "oversight@acme-corp.com"
  },
  "safety_score": 0.96,
  "containment": {
    "emergency_rollback_ready": true,
    "kill_switch_armed": true
  },
  "hitl_required": true,
  "transcendent_mode_enabled": true
}
```

## Testing

### Unit Tests

```bash
# Test GraphQL resolvers
pnpm test server/src/graphql/resolvers/v040/

# Test sandbox runner
cd ops/sandbox && pytest test_evolution_sandbox.py -v

# Test OPA policies
opa test policy/v040/ --verbose
```

### Integration Tests

```bash
# End-to-end tests
npx playwright test tests/e2e/v040/

# Performance benchmarks
k6 run tests/performance/v040/transcendent-intelligence.js
```

### Policy Simulation

```bash
# Test policy decisions
opa eval -d policy/v040/mc-admin-v040.rego \
  -i test/fixtures/transcendent-enable-input.json \
  "data.mc.admin.v040.allow"
```

## Migration Guide

### From v0.3.9 to v0.4.0

1. **Database Migrations**: Run any required schema updates
2. **Configuration**: Add v0.4.0 environment variables
3. **Dependencies**: Install quantum and evolution dependencies
4. **Monitoring**: Deploy new Prometheus rules and Grafana dashboards
5. **Policies**: Deploy updated OPA policies with sandbox validation

### Backward Compatibility

v0.4.0 maintains full backward compatibility with v0.3.9:

- All existing GraphQL operations continue to work
- v0.3.9 policies remain valid alongside v0.4.0 enhancements
- New transcendent features are opt-in via configuration

## Troubleshooting

### Common Issues

1. **Sandbox Timeout**: Increase `EVOLUTION_SANDBOX_TIMEOUT` for complex proposals
2. **OPA Policy Conflicts**: Ensure v0.4.0 policies are loaded after v0.3.9
3. **Quantum Operations Failing**: Check quantum service dependencies
4. **Safety Score Low**: Review safety constraints and monitoring configuration

### Debug Commands

```bash
# Check sandbox status
kubectl logs -l app=mc-platform -c sandbox-runner

# Validate OPA policies
kubectl exec -it deployment/opa -- opa test /policies/

# Monitor transcendent operations
kubectl logs -l app=mc-platform --tail=100 | grep "transcendent"
```

## Security Considerations

1. **Post-Quantum Security**: Ensure PQ cryptographic keys are properly rotated
2. **Sandbox Isolation**: Validate sandbox environment isolation
3. **Evidence Integrity**: Verify cryptographic signatures on all evidence
4. **Human Oversight**: Maintain HITL requirements for high-risk operations

## Performance Optimization

1. **Quantum Coherence**: Monitor and optimize quantum coherence times
2. **Sandbox Caching**: Implement caching for repeated validations
3. **Evolution Batching**: Batch similar evolution proposals
4. **Resource Allocation**: Scale transcendent workloads based on demand

## Next Steps

After successful v0.4.0 integration:

1. **v0.4.1 Planning**: Begin "Sovereign Safeguards" implementation
2. **User Training**: Train operators on transcendent intelligence features
3. **Performance Tuning**: Optimize based on production metrics
4. **Capability Expansion**: Explore additional transcendent capabilities