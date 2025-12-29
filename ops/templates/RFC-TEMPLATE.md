# RFC-NNNN: [Feature Title]

> **Status**: Draft | Review | Approved | Implemented | Rejected
>
> **Author(s)**: [name(s)]
>
> **Created**: YYYY-MM-DD
>
> **Updated**: YYYY-MM-DD
>
> **Target Version**: v3.x.0

## Summary

[One paragraph summary of the proposed feature]

## Motivation

### Problem Statement

[What problem does this solve?]

### User Stories

- As a [role], I want [capability] so that [benefit]
- As a [role], I want [capability] so that [benefit]

### Current Limitations

[What can't users do today?]

## Detailed Design

### Overview

[High-level description of the solution]

### API Changes

#### New Endpoints

```
POST /api/v1/[resource]
GET /api/v1/[resource]/:id
```

#### Request/Response Examples

```json
// Request
{
  "field": "value"
}

// Response (wrapped in DataEnvelope)
{
  "data": { ... },
  "metadata": { ... },
  "governanceVerdict": {
    "verdict": "APPROVED",
    "policy": "...",
    "rationale": "...",
    "timestamp": "...",
    "evaluatedBy": "...",
    "confidence": 0.95
  }
}
```

### Data Model Changes

```sql
-- New tables/columns
CREATE TABLE new_entity (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- Always include tenant_id for isolation
  ...
);
```

### Governance Integration

#### Governance Verdict Requirements

- [ ] All outputs wrapped in DataEnvelope
- [ ] GovernanceVerdict included on all responses
- [ ] New policy rules defined (if applicable)

#### New Policies

```rego
# policies/[feature].rego
package summit.[feature]

default allow = false

allow {
  input.action == "[action]"
  input.principal.roles[_] == "[required_role]"
}
```

### Provenance Requirements

- [ ] Provenance metadata captured for all operations
- [ ] Chain integrity maintained
- [ ] Audit events emitted

```typescript
// Provenance metadata for new operations
interface [Feature]Provenance {
  operationId: string;
  timestamp: string;
  actor: ActorRef;
  inputs: InputHash[];
  outputs: OutputRef[];
}
```

### Compliance Mapping

| Framework | Control | Implementation                |
| --------- | ------- | ----------------------------- |
| SOC 2     | CC6.1   | [how this feature implements] |
| FedRAMP   | AC-X    | [mapping]                     |
| PCI-DSS   | Req X   | [mapping]                     |

### Security Considerations

- [ ] Authentication required
- [ ] Authorization checks implemented
- [ ] Input validation
- [ ] Rate limiting
- [ ] Audit logging

#### Threat Analysis

| Threat     | Mitigation   |
| ---------- | ------------ |
| [Threat 1] | [Mitigation] |
| [Threat 2] | [Mitigation] |

### Performance Implications

- Expected latency impact: [X ms]
- Memory requirements: [X MB]
- Database queries: [count and complexity]
- Caching strategy: [description]

## Alternatives Considered

### Alternative 1: [Name]

**Description**: [Brief description]
**Pros**: [List]
**Cons**: [List]
**Why rejected**: [Reason]

### Alternative 2: [Name]

**Description**: [Brief description]
**Pros**: [List]
**Cons**: [List]
**Why rejected**: [Reason]

## Implementation Plan

### Phase 1: [Name] (v3.x.0)

- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name] (v3.y.0)

- [ ] Task 3
- [ ] Task 4

### Migration Path

[How existing users migrate to new functionality]

## Testing Strategy

### Unit Tests

- [ ] [Test area 1]
- [ ] [Test area 2]

### Integration Tests

- [ ] [Integration scenario 1]
- [ ] [Integration scenario 2]

### Governance Tests

- [ ] Verdict enforcement tested
- [ ] Policy evaluation tested
- [ ] Provenance chain verified

### Compliance Tests

- [ ] Control X verified
- [ ] Evidence collection tested

## Documentation

- [ ] API reference updated
- [ ] User guide section
- [ ] Admin guide section
- [ ] Changelog entry

## Rollout Plan

### Feature Flags

```typescript
// Feature flag for gradual rollout
const FEATURE_FLAG = "summit.[feature].enabled";
```

### Rollout Stages

1. Internal testing (1 week)
2. Beta customers (2 weeks)
3. General availability

### Rollback Plan

[How to disable/rollback if issues arise]

## Open Questions

1. [Question 1]
2. [Question 2]

## References

- [Link to related RFCs]
- [Link to relevant documentation]
- [Link to customer feedback]

---

## RFC Review Checklist

### Author Checklist

- [ ] Summary clearly states the proposal
- [ ] Motivation explains the problem
- [ ] Design follows Summit patterns
- [ ] Governance integration documented
- [ ] Provenance requirements defined
- [ ] Compliance mapping complete
- [ ] Security considerations addressed
- [ ] Performance implications analyzed
- [ ] Alternatives considered
- [ ] Implementation plan realistic
- [ ] Testing strategy comprehensive
- [ ] Documentation planned

### Reviewer Checklist

- [ ] Design is technically sound
- [ ] Governance requirements met
- [ ] Compliance implications acceptable
- [ ] Security review complete
- [ ] Performance acceptable
- [ ] Backward compatibility maintained
- [ ] Testing adequate
- [ ] Documentation sufficient

## Approval

| Role       | Name | Date | Status |
| ---------- | ---- | ---- | ------ |
| Author     |      |      |        |
| Tech Lead  |      |      |        |
| Security   |      |      |        |
| Compliance |      |      |        |
| Product    |      |      |        |
