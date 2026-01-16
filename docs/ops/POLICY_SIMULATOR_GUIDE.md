# Tenant Isolation & Policy Simulator Guide

## Overview

The Tenant Isolation & Policy Simulator is a GA-critical operations tool that allows operators and developers to safely test authorization and policy decisions across tenants, roles, and resources **without touching production data**.

## Purpose

- **Safe Policy Testing**: Simulate authorization decisions before deploying policy changes
- **Cross-Tenant Isolation Validation**: Verify tenant isolation rules are working correctly
- **Debugging Authorization**: Reproduce and understand policy denials
- **Training & Documentation**: Demonstrate how authorization works to team members

## Security Model

### Non-Production Only
- **NO access to production data or secrets**
- Evaluation runs against policy code with **user-supplied inputs only**
- Suitable for development, staging, and controlled production environments with feature flag

### Environment Guards
- Disabled in production by default
- Requires `POLICY_SIMULATOR=1` environment variable to enable in production
- Role-based access: restricted to **admin** and **operator** roles only

## Architecture

### Server-Side Components

**Location**: `server/src/ops/tenant-policy-simulator.ts`

The simulator implements a simplified ABAC (Attribute-Based Access Control) model similar to OPA:

```typescript
interface SimulationInput {
  tenantId: string;
  actor: {
    id: string;
    roles: string[];
  };
  action: string;
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  context?: Record<string, any>;
}
```

**Rule Evaluation Order**:
1. **Tenant Isolation**: Cross-tenant access checks
2. **Role Validation**: Valid role verification
3. **Resource Ownership**: Ownership-based access control
4. **Action Permissions**: Role-based action permissions

### API Endpoints

#### POST `/api/ops/policy/simulate`

Simulate a single policy decision.

**Request**:
```json
{
  "tenantId": "tenant-001",
  "actor": {
    "id": "user-analyst",
    "roles": ["analyst"]
  },
  "action": "read",
  "resource": {
    "type": "case",
    "id": "case-123",
    "attributes": {
      "tenantId": "tenant-001",
      "ownerId": "user-analyst"
    }
  }
}
```

**Response**:
```json
{
  "ok": true,
  "simulation": {
    "decision": "allow",
    "ruleId": "abac.allow",
    "reasons": ["All authorization checks passed"],
    "evaluatedAt": "2026-01-14T10:30:00Z",
    "trace": {
      "steps": [
        {
          "rule": "tenant_isolation",
          "matched": true,
          "reason": "Tenant isolation check passed"
        },
        {
          "rule": "role_validation",
          "matched": true,
          "reason": "Valid roles found: analyst"
        },
        {
          "rule": "resource_ownership",
          "matched": true,
          "reason": "Actor owns resource"
        },
        {
          "rule": "action_permissions",
          "matched": true,
          "reason": "Role analyst has permission for action read on case"
        }
      ]
    }
  }
}
```

#### GET `/api/ops/policy/fixtures`

Retrieve predefined test fixtures for common scenarios.

**Response**:
```json
{
  "ok": true,
  "fixtures": [
    {
      "id": "allow-admin-read",
      "name": "Admin can read any resource",
      "description": "Admins have full access to all resources",
      "input": { /* SimulationInput */ },
      "expectedDecision": "allow"
    }
  ]
}
```

#### POST `/api/ops/policy/fixtures/run`

Run all test fixtures and return results.

**Response**:
```json
{
  "ok": true,
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  },
  "results": [ /* individual fixture results */ ]
}
```

### Client-Side UI

**Location**: `client/src/pages/PolicySimulator.tsx`
**Route**: `/ops/policy-simulator`

**Key Features**:
- Interactive form for simulation inputs
- Real-time JSON validation
- Results display with trace visualization
- Fixture library for quick testing
- Offline mode detection
- Loading/error/empty states

## Usage Guide

### Prerequisites

1. **Authentication**: Must be logged in as **admin** or **operator**
2. **Environment**: Feature must be enabled via feature flag or environment variable
3. **Network**: Online connection required for simulations

### Basic Workflow

1. **Navigate to Simulator**
   - Go to `/ops/policy-simulator` in the application
   - Or select "Policy Simulator" from the admin navigation menu

2. **Configure Simulation**
   - Enter **Tenant ID** (e.g., `tenant-001`)
   - Enter **Actor ID** (e.g., `user-analyst`)
   - Select **Actor Roles** (e.g., `analyst`)
   - Select **Action** (e.g., `read`, `write`, `delete`)
   - Select **Resource Type** (e.g., `case`, `evidence`, `workflow`)
   - Enter **Resource ID** (e.g., `case-123`)
   - Optionally add **Resource Attributes** as JSON
   - Optionally add **Context** as JSON

3. **Run Simulation**
   - Click "Run Simulation"
   - View decision (Allow/Deny)
   - Review reasons and trace

4. **Use Fixtures (Optional)**
   - Load predefined scenarios from the fixture library
   - Run all fixtures to verify policy consistency

### Common Scenarios

#### Scenario 1: Verify Cross-Tenant Access Denial

**Objective**: Ensure users cannot access resources from other tenants

**Input**:
```json
{
  "tenantId": "tenant-001",
  "actor": { "id": "user-analyst", "roles": ["analyst"] },
  "action": "read",
  "resource": {
    "type": "case",
    "id": "case-456",
    "attributes": { "tenantId": "tenant-002" }
  }
}
```

**Expected Result**: `deny` with `tenant_isolation` rule violation

#### Scenario 2: Reproduce a Policy Denial

**Objective**: Debug why a user was denied access

1. Copy tenant ID, user ID, and resource details from System Health logs
2. Paste into simulator
3. Review trace to understand which rule failed
4. Adjust policy or permissions as needed

#### Scenario 3: Test Policy Changes

**Objective**: Validate new policy before deployment

1. Load fixture representing current behavior
2. Note expected decision
3. After deploying policy change, re-run fixture
4. Verify decision matches expectations

## Integration with System Health

The Policy Simulator complements the System Health dashboard by allowing **proactive** testing of scenarios that might appear in **denial logs**.

**Recommended Workflow**:
1. See denial in System Health logs
2. Open Policy Simulator
3. Copy relevant parameters from log
4. Simulate to understand root cause
5. Fix policy or user permissions
6. Re-run to verify fix

## Adding Custom Fixtures

Fixtures are defined in `server/src/ops/tenant-policy-simulator.ts` in the `getFixtures()` method.

**Example**:
```typescript
{
  id: 'custom-scenario',
  name: 'Custom test scenario',
  description: 'Tests specific authorization pattern',
  input: {
    tenantId: 'tenant-001',
    actor: { id: 'user-test', roles: ['operator'] },
    action: 'workflow:manage',
    resource: {
      type: 'workflow',
      id: 'workflow-123',
      attributes: { tenantId: 'tenant-001' }
    }
  },
  expectedDecision: 'allow'
}
```

## Troubleshooting

### Simulator Disabled

**Symptom**: "Policy simulator is disabled in production"

**Solution**: Set `POLICY_SIMULATOR=1` environment variable or enable via feature flag

### Access Denied

**Symptom**: 403 Forbidden when accessing simulator

**Solution**: Ensure user has **admin** or **operator** role

### Offline Mode

**Symptom**: "Cannot run simulation while offline"

**Solution**: Restore network connectivity; cached results may be viewable

### Invalid JSON

**Symptom**: "Invalid JSON format" error

**Solution**: Validate JSON syntax in attributes or context fields using a JSON validator

## Testing

### Unit Tests

Location: `server/src/ops/__tests__/tenant-policy-simulator.test.ts`

Run with:
```bash
npm test -- tenant-policy-simulator.test
```

### Integration Tests

Location: `server/src/routes/__tests__/ops-policy-simulator.test.ts`

Run with:
```bash
npm test -- ops-policy-simulator.test
```

### Client Tests

Location: `client/src/pages/__tests__/PolicySimulator.test.tsx`

Run with:
```bash
npm test -- PolicySimulator.test
```

### Smoke Tests

Location: `client/src/__tests__/route-smoke.test.tsx`

Ensures no console errors on render.

## Monitoring

### Metrics to Track

- **Simulation request rate**: Monitor for abuse
- **Decision distribution**: Track allow vs deny ratio
- **Error rate**: Alert on elevated errors
- **Latency**: Simulations should complete <100ms

### Logs

All simulations are logged with:
- Tenant ID
- Action
- Resource type
- Duration
- Decision

Search logs with:
```
module:tenant-policy-simulator
```

## Limitations

1. **Simplified Policy Model**: The simulator implements a subset of full OPA policy capabilities
2. **No Database Access**: Cannot simulate policies that require database lookups
3. **Static Rules**: Policy changes require code deployment (future: hot-reload support)
4. **No Multi-Step Workflows**: Simulates single authorization decisions only

## Roadmap

### Planned Enhancements

- [ ] OPA bundle integration for real policy evaluation
- [ ] Policy hot-reload support
- [ ] Export simulation results as test cases
- [ ] Batch simulation API
- [ ] Policy diff viewer (compare two policy versions)
- [ ] Integration with CI/CD for policy regression testing
- [ ] Historical decision replay

## Related Documentation

- [AUTHZ_IMPLEMENTATION_SUMMARY.md](/docs/AUTHZ_IMPLEMENTATION_SUMMARY.md)
- [RBAC_MATRIX.md](/docs/RBAC_MATRIX.md)
- [TENANCY_ISOLATION.md](/docs/TENANCY_ISOLATION.md)
- [SECURITY.md](/docs/SECURITY.md)

## Support

For questions or issues with the Policy Simulator:

1. Check this guide first
2. Review test cases for examples
3. File an issue in the repository
4. Contact the operations team

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-14
**Maintained By**: Operations & Security Team
