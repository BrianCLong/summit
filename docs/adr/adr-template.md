# ADR-NNNN: [Short Title of Decision]

**Date:** YYYY-MM-DD
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]
**Area:** [Data | AI/ML | Infrastructure | Auth/Security | API | UX | Observability | Compliance]
**Owner:** [Team/Guild name]
**Tags:** [comma, separated, tags]

## Context

What is the issue we're addressing? What forces are at play? What constraints exist?

- Business/product context
- Technical context
- Organizational context
- Current pain points or limitations

## Decision

What is the change we're proposing/making?

### Core Decision
Clear statement of the architectural decision.

### Key Components
- Component 1: Description
- Component 2: Description
- Component 3: Description

### Implementation Details
Brief overview of how this will be implemented (expand in Code References section).

## Alternatives Considered

What other options did we evaluate?

### Alternative 1: [Name]
- **Description:** Brief description
- **Pros:** What makes this attractive
- **Cons:** Why we didn't choose it
- **Cost/Complexity:** Estimate

### Alternative 2: [Name]
- **Description:** Brief description
- **Pros:** What makes this attractive
- **Cons:** Why we didn't choose it
- **Cost/Complexity:** Estimate

## Consequences

What becomes easier or harder because of this decision?

### Positive
- Benefit 1
- Benefit 2
- Benefit 3

### Negative
- Trade-off 1
- Trade-off 2
- Trade-off 3

### Neutral
- Change 1
- Change 2

### Operational Impact
- Monitoring/observability requirements
- Performance implications
- Security implications
- Compliance implications

## Code References

Links to the actual implementation:

### Core Implementation
- `path/to/module.ts` - Primary implementation
- `path/to/service.ts:L123-L456` - Specific critical logic
- `path/to/config/` - Configuration

### Data Models
- `path/to/schema.ts` - Database schema
- `path/to/types.ts` - Type definitions

### APIs
- `path/to/graphql/schema.graphql` - GraphQL schema
- `path/to/api/routes.ts` - REST endpoints

## Tests & Validation

How do we enforce/validate this decision?

### Unit Tests
- `path/to/test.spec.ts` - Test coverage for core logic
- Expected coverage: XX%

### Integration Tests
- `path/to/integration.test.ts` - End-to-end validation
- `path/to/contract.test.ts` - Contract tests

### Evaluation Criteria
- Performance benchmarks (if applicable)
- Security tests/scans (if applicable)
- Policy tests (if applicable): `policy/path/test.rego`

### CI Enforcement
- Which CI checks enforce this decision?
- Which linters/validators ensure compliance?

## Migration & Rollout

How do we transition to this decision?

### Migration Steps
1. Step 1
2. Step 2
3. Step 3

### Rollback Plan
- How to revert if needed
- Data migration reversibility
- Feature flag strategy (if applicable)

### Timeline
- Phase 1: Description (Date range)
- Phase 2: Description (Date range)
- Completion: Target date

## References

Related documentation and context:

### Related ADRs
- ADR-XXXX: Related decision
- ADR-YYYY: Dependency or context

### External Resources
- [Link to relevant documentation](url)
- [Research paper or blog post](url)
- [Third-party library documentation](url)

### Discussion
- [RFC/Design doc](link)
- [GitHub issue/discussion](link)
- [Slack thread](link) (if preserved)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | Name | Initial version |
