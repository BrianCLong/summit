# INFOWAR Narrative Graph Architecture

The INFOWAR Narrative Graph uses Neo4j to track the propagation and impact of information operations.

## Ontology
- **Nodes:** Narrative, Claim, Actor, Platform, Event, Artifact, Regulation
- **Edges:** AMPLIFIES, REFERENCES, TARGETS, COUPLED_WITH, EVIDENCED_BY

## Secure Query Patterns
All Cypher queries must be parameterized to prevent injection. Narrative IDs and other user-provided strings must NEVER be interpolated directly.

```typescript
// Good
MATCH (n:Narrative { id: $narrativeId })
// Bad
MATCH (n:Narrative { id: '${narrativeId}' })
```
