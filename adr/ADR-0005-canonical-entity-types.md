# ADR-0005: Canonical Entity Types with Bitemporal Support

## Status
Accepted

## Date
2025-11-21

## Context

Summit's current entity model uses a generic `Entity` type with a `type` field discriminator and `props` JSON blob. While flexible, this approach has limitations:

1. **No type safety** - Entity properties are untyped JSON
2. **No standardization** - Different connectors create entities with inconsistent schemas
3. **No temporal tracking** - Entities lack bitemporal fields for tracking validity vs observation time
4. **Limited graph semantics** - Generic types don't capture domain semantics (Person, Organization, etc.)
5. **Compliance gaps** - Cannot enforce required fields for specific entity types

The Council Wishbook requires entities that support:
- Bitemporal queries (what was true at time T?)
- Provenance tracking (where did this come from?)
- Classification and compartmentation
- Entity resolution and canonicalization

## Decision

We will implement **8 canonical entity types** with standardized schemas and bitemporal support:

### Entity Types
1. **Person** - Individuals with identity information
2. **Organization** - Legal entities, companies, groups
3. **Asset** - Physical and financial assets (vehicles, vessels, accounts, crypto)
4. **Location** - Geographic places with coordinates
5. **Event** - Time-bound occurrences
6. **Document** - Unstructured content (reports, emails, images)
7. **Claim** - Assertions and allegations with verification status
8. **Case** - Investigations and workflows

### Bitemporal Fields
All entities will include:
- `validFrom` / `validTo` - When the fact was true in the real world
- `observedAt` - When the fact was observed/discovered
- `recordedAt` - When recorded in the system (immutable)

### Implementation
- TypeScript interfaces in `@summit/canonical-entities` package
- GraphQL types implementing `CanonicalEntity` interface
- Zod validation schemas for runtime checking
- Neo4j labels for efficient graph queries

## Consequences

### Positive
- Type-safe entity handling across the platform
- Standardized schemas enable better connector interoperability
- Bitemporal queries enable historical analysis
- GraphQL types improve API documentation and client code generation
- Better entity resolution through standardized key fields

### Negative
- Migration effort for existing generic entities
- More complex schema to maintain
- Learning curve for developers
- Potential performance impact from additional indexes

### Mitigations
- Provide migration scripts for existing data
- Document entity type selection guidelines
- Index optimization for bitemporal queries
- Gradual rollout starting with new investigations

## Implementation Notes

```typescript
// Example: Creating a Person entity
const person: Person = {
  entityType: 'Person',
  props: {
    name: 'John Doe',
    dateOfBirth: new Date('1980-01-15'),
    nationalities: ['US'],
  },
  validFrom: new Date('2020-01-01'),
  validTo: null, // Still valid
  observedAt: new Date('2024-06-15'),
  recordedAt: new Date(), // Immutable
  confidence: 0.95,
  source: 'connector:ofac-sdn',
  classification: 'UNCLASSIFIED',
};
```

## Related
- [Canonical Entities Package](/packages/canonical-entities/)
- [Strategic Implementation Roadmap](/docs/STRATEGIC_IMPLEMENTATION_ROADMAP.md)
- ADR-0001: Choose Neo4j
