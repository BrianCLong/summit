# Agent Onboarding Guide

Complete guide for onboarding new AI agents to the Summit platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Agent Types](#agent-types)
3. [Registration Process](#registration-process)
4. [Capability Planning](#capability-planning)
5. [Safety Certification](#safety-certification)
6. [Integration Steps](#integration-steps)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before onboarding an agent, ensure you have:

- [ ] Access to Summit Admin console
- [ ] Understanding of agent's purpose and scope
- [ ] List of required capabilities
- [ ] Tenant/project IDs the agent will access
- [ ] Owner/responsible party identified
- [ ] Testing environment available

## Agent Types

Summit supports three agent types:

### 1. Internal Agents
- Developed and maintained by your organization
- Full trust model
- Can be certified more easily
- Examples: maintenance agents, data processors

### 2. External Agents
- Third-party agents
- Require strict certification
- Limited default capabilities
- Examples: vendor integrations, partner automations

### 3. Partner Agents
- Trusted partner organizations
- Moderate certification requirements
- Scoped to specific projects
- Examples: consulting firm tools, strategic partner automations

## Registration Process

### Step 1: Define Agent Scope

Create an agent specification:

```json
{
  "name": "data-quality-agent",
  "description": "Monitors and improves data quality metrics",
  "agentType": "internal",
  "purpose": "Automated data quality management",
  "owner": {
    "userId": "user-123",
    "email": "data-team@company.com",
    "team": "Data Engineering"
  },
  "scope": {
    "tenants": ["prod-tenant-1"],
    "projects": ["project-data-pipeline"],
    "justification": "Needs access to validate pipeline outputs"
  }
}
```

### Step 2: Request Capabilities

Determine required capabilities:

| Capability | Description | Risk Level | Justification Required |
|------------|-------------|------------|----------------------|
| `read:data` | Read entity/relationship data | Low | Basic |
| `write:data` | Create/update entities | Medium | Yes |
| `delete:data` | Delete entities | High | Yes + Approval |
| `execute:pipelines` | Trigger pipelines | Medium | Yes |
| `execute:commands` | Run CLI commands | High | Yes + Approval |
| `query:database` | Direct database queries | Medium | Yes |
| `manage:config` | Modify configuration | High | Yes + Approval |
| `security:impersonate` | User impersonation | Critical | Yes + Multi-approval |
| `export:data` | Export data | Medium | Yes |
| `import:data` | Import data | Medium | Yes |

**Principle of Least Privilege**: Only request capabilities actually needed.

### Step 3: Create Agent via API

```bash
curl -X POST http://localhost:3001/api/admin/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "data-quality-agent",
    "description": "Monitors and improves data quality metrics",
    "agentType": "internal",
    "tenantScopes": ["prod-tenant-1"],
    "projectScopes": ["project-data-pipeline"],
    "capabilities": [
      "read:data",
      "write:data",
      "query:database"
    ],
    "restrictions": {
      "maxRiskLevel": "medium",
      "requireApproval": ["high", "critical"],
      "maxDailyRuns": 500,
      "maxConcurrentRuns": 5,
      "deniedOperations": ["delete"]
    },
    "ownerId": "user-123",
    "metadata": {
      "team": "Data Engineering",
      "purpose": "data quality",
      "supportContact": "data-team@company.com"
    },
    "tags": ["automation", "data-quality", "internal"]
  }'
```

Response:
```json
{
  "id": "agent-abc-123",
  "name": "data-quality-agent",
  "status": "active",
  "isCertified": false,
  ...
}
```

### Step 4: Generate Credentials

```bash
curl -X POST http://localhost:3001/api/admin/agents/agent-abc-123/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "credentialType": "api_key",
    "options": {
      "expiresInDays": 365,
      "rateLimitPerHour": 1000,
      "rateLimitPerDay": 10000
    }
  }'
```

Response:
```json
{
  "credential": {
    "id": "cred-xyz-789",
    "keyPrefix": "agt_abc123",
    "expiresAt": "2025-11-20T00:00:00Z",
    ...
  },
  "apiKey": "agt_abc123456789..." // SAVE THIS - shown only once
}
```

**⚠️ IMPORTANT**: Save the API key immediately. It's shown only once.

## Capability Planning

### Capability Matrix

Use this matrix to plan capabilities:

```
Task: Validate Data Quality
├─ Read entities ────────────► read:data (REQUIRED)
├─ Query metrics ────────────► query:database (REQUIRED)
├─ Update quality scores ────► write:data (REQUIRED)
├─ Delete invalid records ───► delete:data (OPTIONAL - can flag instead)
└─ Export reports ───────────► export:data (NICE-TO-HAVE)

Decision: Request read:data, query:database, write:data only
```

### Risk Assessment

Each action is assessed for risk:

```python
def assess_risk(action):
    risk_factors = []

    # Action type risk
    if action.type in ['delete', 'config:modify']:
        risk_factors.append(('action_type', 'high'))

    # Certification status
    if not agent.isCertified:
        risk_factors.append(('uncertified', 'medium'))

    # Scope breadth
    if len(agent.tenantScopes) > 5:
        risk_factors.append(('broad_scope', 'medium'))

    # Determine overall risk
    return max(risk_factors, key=lambda x: RISK_LEVELS[x[1]])
```

## Safety Certification

### Certification Requirements

External and partner agents MUST be certified before production use.

#### Level 1: Basic Certification (Internal Agents)
- Pass safety scenario tests
- Document intended behavior
- Owner approval
- Valid for 1 year

#### Level 2: Standard Certification (Partner Agents)
- Level 1 requirements
- Security review
- Integration testing
- Valid for 6 months

#### Level 3: Advanced Certification (External Agents)
- Level 2 requirements
- Third-party security audit
- Compliance review
- Valid for 3 months

### Certification Process

1. **Submit Certification Request**

```bash
curl -X POST http://localhost:3001/api/admin/agents/agent-abc-123/certification/request \
  -H "Content-Type: application/json" \
  -d '{
    "level": "basic",
    "testResults": {
      "safetyScenarios": "passed",
      "integrationTests": "passed"
    },
    "documentation": "https://docs.company.com/agents/data-quality",
    "securityReview": "completed"
  }'
```

2. **Run Safety Tests**

```bash
npm run test:safety -- --agent=agent-abc-123
```

Must pass all scenarios:
- ✓ Cross-tenant access blocked
- ✓ Rate limits enforced
- ✓ High-risk actions require approval
- ✓ Capability enforcement working
- ✓ Audit trail complete

3. **Grant Certification**

```bash
curl -X POST http://localhost:3001/api/admin/agents/agent-abc-123/certify \
  -H "Content-Type: application/json" \
  -d '{
    "expiresInDays": 365,
    "certificationLevel": "basic",
    "reviewedBy": "admin-user-1"
  }'
```

## Integration Steps

### Phase 1: Development & Testing (SIMULATION Mode)

```typescript
import fetch from 'node-fetch';

const agent = {
  apiKey: 'agt_...',
  gatewayUrl: 'http://localhost:3001',
};

async function testAgent() {
  const response = await fetch(`${agent.gatewayUrl}/api/agent/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agent.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: 'prod-tenant-1',
      operationMode: 'SIMULATION', // No real execution
      action: {
        type: 'read',
        target: 'entities',
        payload: { filter: 'status=active' }
      }
    })
  });

  const result = await response.json();
  console.log(result);
  // Result will show "would execute" without actual changes
}
```

### Phase 2: Validation (DRY_RUN Mode)

```typescript
async function validateAgent() {
  const response = await fetch(`${agent.gatewayUrl}/api/agent/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agent.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: 'prod-tenant-1',
      operationMode: 'DRY_RUN', // Planning/validation only
      action: {
        type: 'write',
        target: 'quality_scores',
        payload: { scores: [...] }
      }
    })
  });

  const result = await response.json();
  // Validation performed, no data modifications
}
```

### Phase 3: Production (ENFORCED Mode)

```typescript
async function runProduction() {
  // Check quotas first
  const quotas = await fetch(`${agent.gatewayUrl}/api/agent/quotas`, {
    headers: { 'Authorization': `Bearer ${agent.apiKey}` }
  }).then(r => r.json());

  console.log('Quota status:', quotas);

  // Execute with real effects
  const response = await fetch(`${agent.gatewayUrl}/api/agent/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agent.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: 'prod-tenant-1',
      operationMode: 'ENFORCED', // Real execution
      action: {
        type: 'write',
        target: 'quality_scores',
        payload: { scores: [...] }
      }
    })
  });

  const result = await response.json();

  if (result.approval) {
    console.log('Action requires approval:', result.approval.id);
    // Wait for human approval
  } else if (result.success) {
    console.log('Action completed:', result.result);
  } else {
    console.error('Action failed:', result.error);
  }
}
```

## Best Practices

### 1. Start with Least Privilege

```typescript
// ❌ DON'T: Request all capabilities upfront
capabilities: ["read:data", "write:data", "delete:data", "execute:commands", ...]

// ✅ DO: Start minimal, add as needed
capabilities: ["read:data"]
// Then add write:data after testing read operations
```

### 2. Use Operation Modes Appropriately

```typescript
// Development
operationMode: 'SIMULATION'

// Staging
operationMode: 'DRY_RUN'

// Production (low-risk)
operationMode: 'ENFORCED'
```

### 3. Implement Graceful Approval Handling

```typescript
async function executeWithApproval(action) {
  const result = await executeRequest(action);

  if (result.approval) {
    console.log(`Approval required: ${result.approval.id}`);
    console.log(`Expires at: ${result.approval.expiresAt}`);

    // Don't poll aggressively
    return await waitForApproval(result.approval.id, {
      checkInterval: 60000, // 1 minute
      timeout: 3600000 // 1 hour
    });
  }

  return result;
}
```

### 4. Monitor and Alert

```typescript
async function monitorHealth() {
  const quotas = await getQuotas();

  quotas.forEach(quota => {
    const utilization = quota.used / quota.limit;

    if (utilization > 0.9) {
      alert(`Quota ${quota.quotaType} at ${utilization * 100}%`);
    }
  });
}

setInterval(monitorHealth, 300000); // Every 5 minutes
```

### 5. Handle Errors Gracefully

```typescript
async function safeExecute(action) {
  try {
    const result = await executeRequest(action);

    if (!result.success) {
      if (result.error?.code === 'QUOTA_EXCEEDED') {
        // Wait and retry
        await sleep(60000);
        return safeExecute(action);
      } else if (result.error?.code === 'SCOPE_VIOLATION') {
        // Don't retry, log security violation
        logSecurityEvent(result.error);
        throw new Error('Scope violation');
      } else {
        // Other errors
        logError(result.error);
        throw new Error(result.error.message);
      }
    }

    return result;
  } catch (error) {
    logError(error);
    throw error;
  }
}
```

### 6. Rotate Credentials Regularly

```typescript
async function rotateCredentials() {
  // Schedule credential rotation every 90 days
  const newCred = await fetch(`${adminUrl}/api/admin/credentials/${credId}/rotate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());

  // Update agent configuration
  updateConfig({ apiKey: newCred.apiKey });

  // Old credential is automatically revoked
}
```

## Troubleshooting

### Common Issues

#### 1. "Authentication failed"
```
Cause: Invalid or expired API key
Fix: Verify API key, check expiration, generate new credential if needed
```

#### 2. "Scope violation"
```
Cause: Attempting to access tenant/project not in agent's scope
Fix: Update agent scopes or use correct tenant ID
```

#### 3. "Quota exceeded"
```
Cause: Hit rate limit or quota
Fix: Check quotas, wait for reset, or request limit increase
```

#### 4. "Policy denied"
```
Cause: OPA policy rejected the action
Fix: Check capabilities, risk level, certification status
```

#### 5. "Approval required"
```
Cause: High-risk action needs human approval
Fix: Wait for approval, or reduce risk level of action
```

### Debug Mode

Enable detailed logging:

```bash
ENABLE_DETAILED_LOGGING=true npm start
```

### Support

- Documentation: https://docs.summit.platform/agents
- Support: agent-support@company.com
- Security: security@company.com

## Checklist

Before deploying to production:

- [ ] Agent registered and certified
- [ ] Credentials generated and securely stored
- [ ] Capabilities minimized (least privilege)
- [ ] Tenant/project scopes verified
- [ ] Quotas configured appropriately
- [ ] Safety tests passing
- [ ] Error handling implemented
- [ ] Monitoring and alerting set up
- [ ] Documentation completed
- [ ] Incident response plan defined
- [ ] Owner/support contact configured
- [ ] Tested in SIMULATION mode
- [ ] Tested in DRY_RUN mode
- [ ] Gradual rollout plan defined
