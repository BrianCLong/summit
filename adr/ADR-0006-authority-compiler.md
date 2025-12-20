# ADR-0006: Authority/License Compiler for Policy Enforcement

## Status
Accepted

## Date
2025-11-21

## Context

Summit requires fine-grained access control that goes beyond traditional RBAC:

1. **Data Sensitivity** - Different classification levels (UNCLASSIFIED → TOP SECRET)
2. **Compartmentation** - Need-to-know restrictions beyond clearance level
3. **License Enforcement** - Data usage restrictions from source providers
4. **Two-Person Control** - Sensitive operations requiring approval
5. **Audit Requirements** - All access decisions must be traceable

Current authentication (JWT/JWKS) and basic role checks are insufficient for Council Wishbook requirements.

## Decision

We will implement an **Authority/License Compiler** that:

### Policy Definition
- Define policies as data (YAML/JSON schema)
- Support RBAC + ABAC hybrid model
- Integrate with OPA for complex evaluations
- Version and audit policy changes

### Runtime Enforcement
- Compile policies into optimized runtime format
- Evaluate access decisions with < 10ms latency
- Cache decisions with appropriate TTL
- Support hot-reload of policy updates

### Key Concepts

```yaml
# Authority grants permissions to subjects for resources
authority:
  id: analyst-read-unclassified
  subjects:
    roles: [analyst, senior_analyst]
  permissions: [READ, QUERY]
  resources:
    classifications: [UNCLASSIFIED, CUI]
    entityTypes: [Person, Organization, Asset]
  conditions:
    requireMFA: false
    maxRecords: 1000
```

### Two-Person Control
- Define workflows requiring approval
- Support approval chains and escalation
- Timeout handling for pending requests
- Audit all approval decisions

### Integration Points
- GraphQL directive for resolver-level enforcement
- Express middleware for REST endpoints
- Copilot pre-query validation
- Export authorization with manifest generation

## Consequences

### Positive
- Centralized policy management
- Consistent enforcement across all services
- Auditable access decisions
- Flexible ABAC rules
- OPA integration for complex logic

### Negative
- Additional latency on requests (mitigated by caching)
- Policy complexity requires expertise
- Potential for misconfiguration blocking legitimate access
- OPA learning curve

### Mitigations
- Comprehensive policy testing framework
- Default-deny with explicit grants
- Policy simulation mode for testing
- Clear denial reasons with appeal paths
- Policy change review workflow

## Implementation

```typescript
// Middleware integration
import { createAuthorityMiddleware, PolicyEvaluator } from '@summit/authority-compiler';

app.use(createAuthorityMiddleware({
  evaluator: new PolicyEvaluator(compiledPolicy),
  extractUser: (req) => req.user,
  extractResource: (req) => ({ entityType: req.params.type }),
}));

// GraphQL directive
const typeDefs = gql`
  type Query {
    person(id: ID!): Person @authority(operation: "READ", entityType: "Person")
  }
`;
```

## Related
- [Authority Compiler Package](/packages/authority-compiler/)
- [Governance Integration Points](/docs/governance/INTEGRATION_POINTS.md)
- ADR-0002: ABAC Step-up
