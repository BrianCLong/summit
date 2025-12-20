# Canonical Entities & Graph Schema

> **Stack**: TypeScript/Node.js
> **Location**: `packages/canonical-entities/`
> **Purpose**: Canonical graph data model with temporal and policy/governance labels

## Overview

This package provides a **comprehensive graph schema** for the Summit intelligence analysis platform with:

- **19 canonical entity types** with strong typing
- **Edge/relationship types** with temporal and policy labels
- **Temporal/bitemporal query helpers** for time-travel queries
- **Policy & governance engine** (ABAC/RBAC-lite) for access control

All entities and edges support:
- **Bitemporal tracking**: `validFrom`/`validTo` (when facts were true) + `recordedAt` (when we learned about them)
- **Policy labels**: `sensitivity`, `purpose`, `legalBasis`, `retentionClass`, `licenseId`, `needToKnowTags`
- **Provenance**: Source tracking and confidence scores

---

## Core Concepts

### 1. Entities (Nodes)

**Base Entity Interface:**
```typescript
interface CanonicalEntity extends BitemporalFields, PolicyLabels {
  id: string;
  entityType: EntityType;
  confidence: number;
  tenantId: string;
  // ... temporal and policy fields
}
```

**Supported Entity Types (19 total):**

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `Person` | Individual | John Doe, analyst, suspect |
| `Organization` | Company, agency | ACME Corp, FBI |
| `Asset` | Physical/financial asset | Bank account, real estate |
| `Location` | Geographic place | Address, coordinates |
| `Event` | Something that happened | Transaction, meeting |
| `Document` | Unstructured content | Email, report, image |
| `Claim` | Assertion or allegation | "X funded Y" |
| `Case` | Investigation workflow | Case #12345 |
| `Account` | Online account | @user123, service account |
| `Communication` | Message/call | Email, phone call |
| `Device` | Computer/mobile/IoT | Laptop, server |
| `Vehicle` | Car, truck, etc. | License plate ABC-123 |
| `Infrastructure` | Domain, IP, network | example.com, 1.2.3.4 |
| `FinancialInstrument` | Stock, bond, crypto | AAPL, BTC |
| `Indicator` | IoC/TTP | Malware signature |
| `Narrative` | Storyline, campaign | Disinformation narrative |
| `Campaign` | Coordinated operation | APT campaign |
| `Authority` | Government/regulatory | FBI, OFAC |
| `License` | Export control, data use | ITAR license |

**Example Entity:**
```typescript
const person: Person = {
  id: 'person-123',
  entityType: 'Person',
  confidence: 0.95,
  tenantId: 'tenant-1',
  createdBy: 'analyst1',

  // Temporal fields
  validFrom: new Date('2020-01-01'),
  validTo: null, // Still valid
  observedAt: new Date('2020-06-15'),
  recordedAt: new Date('2020-06-16'),

  // Policy labels
  sensitivity: 'CONFIDENTIAL',
  purpose: ['CTI_ANALYSIS'],
  needToKnowTags: ['TEAM_ALPHA'],

  // Person-specific
  props: {
    name: 'John Doe',
    dateOfBirth: new Date('1980-01-01'),
    nationalities: ['US'],
  },

  // ... other required fields
};
```

### 2. Edges (Relationships)

**Base Edge Interface:**
```typescript
interface GraphEdge extends BitemporalFields, PolicyLabels {
  id: string;
  type: EdgeType;
  fromId: string;
  toId: string;
  confidence: number;
  weight?: number;
  // ... temporal and policy fields
}
```

**Supported Edge Types:**

- `communicatesWith` - Communication relationship
- `funds` - Financial flow
- `owns` - Ownership
- `controls` - Control relationship
- `locatedAt` - Physical location
- `observedAt` - Observation at event
- `derivedFrom` - Data lineage
- `supports` - Supporting evidence
- `contradicts` - Contradicting evidence
- `mentions` - Mentioned in document
- `attributedTo` - Attribution
- `partOf` - Hierarchical relationship
- `memberOf` - Membership
- `relatedTo` - Generic relationship
- ... and more

**Example Edge:**
```typescript
const edge: FundsEdge = {
  id: 'edge-456',
  type: 'funds',
  fromId: 'account-789',
  toId: 'person-123',
  confidence: 0.9,

  // Temporal
  validFrom: new Date('2020-03-01'),
  validTo: new Date('2020-03-31'),
  recordedAt: new Date('2020-04-01'),

  // Policy
  sensitivity: 'CONFIDENTIAL',
  purpose: ['AML_INVESTIGATION'],

  // Edge-specific properties
  properties: {
    amount: 50000,
    currency: 'USD',
    transactionDate: new Date('2020-03-15'),
    transactionType: 'transfer',
  },

  // ... other required fields
};
```

### 3. Temporal Fields (Bitemporal Model)

All entities and edges have four time dimensions:

| Field | Meaning | Example |
|-------|---------|---------|
| `validFrom` | When the fact became true in the real world | Person joined company on 2020-01-01 |
| `validTo` | When the fact stopped being true (null = still valid) | Person left company on 2021-01-01 |
| `observedAt` | When we observed/discovered this fact | We learned about it on 2020-06-15 |
| `recordedAt` | When we recorded it in the system (immutable) | Recorded on 2020-06-16 |

**Why Bitemporal?**
- **Time travel**: Query "what did we know on date X?"
- **Audit trail**: Track when facts were discovered vs when they occurred
- **Retroactive corrections**: Update past data without losing history

### 4. Policy/Governance Labels

All entities and edges can have policy labels for access control:

| Label | Purpose | Example |
|-------|---------|---------|
| `sensitivity` | Data sensitivity level | `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `SECRET` |
| `purpose` | Purpose limitation (GDPR) | `['CTI_ANALYSIS', 'COMPLIANCE']` |
| `legalBasis` | Legal basis for processing | `'GDPR Art. 6(1)(f)'` |
| `retentionClass` | Retention policy | `'7_YEAR_RETENTION'` |
| `licenseId` | Export control license | `'EXPORT_LICENSE_US'` |
| `needToKnowTags` | Compartmentalization tags | `['TEAM_ALPHA', 'PROJECT_X']` |

---

## Usage Examples

### Time-Travel Queries

```typescript
import { filterEntitiesAsOf, buildGraphSnapshotAtTime } from '@summit/canonical-entities';

// Get entities valid on a specific date
const entitiesIn2020 = filterEntitiesAsOf(allEntities, new Date('2020-06-01'));

// Build a complete graph snapshot at a point in time
const snapshot = buildGraphSnapshotAtTime(
  allNodes,
  allEdges,
  new Date('2020-01-01')
);

console.log(`Snapshot has ${snapshot.nodes.length} nodes and ${snapshot.edges.length} edges`);
```

### Bitemporal Queries

```typescript
import { isBitemporallyValid, buildBitemporalGraphSnapshot } from '@summit/canonical-entities';

// Check if entity was valid at a time AND we knew about it
const wasKnown = isBitemporallyValid(
  entity,
  new Date('2020-06-15'), // Valid time: when fact was true
  new Date('2020-07-01')  // Transaction time: when we knew about it
);

// Build snapshot with bitemporal constraints
const bitemporalSnapshot = buildBitemporalGraphSnapshot(
  nodes,
  edges,
  new Date('2020-06-15'),  // Show facts valid on this date
  new Date('2020-07-01')   // ... that we knew about by this date
);
```

### Policy-Based Access Control

```typescript
import { checkAccess, filterByAccess } from '@summit/canonical-entities';

// Define user context
const user = {
  userId: 'analyst1',
  roles: ['ANALYST'],
  clearances: ['INTERNAL'],
  purposes: ['CTI_ANALYSIS'],
  needToKnowTags: ['TEAM_ALPHA'],
};

// Check access to a single entity
const decision = checkAccess({
  user,
  object: entity,
  operation: 'READ'
});

if (decision.allow) {
  console.log('Access granted');
} else {
  console.log('Access denied:', decision.reason);
}

// Filter a collection based on user access
const visibleEntities = filterByAccess(user, allEntities, 'READ');
```

### Policy Rules

The policy engine evaluates these rules in order:

1. **Sensitivity vs Clearance**: User clearance must be >= object sensitivity
   ```typescript
   // User with INTERNAL clearance can access PUBLIC and INTERNAL objects
   // but NOT CONFIDENTIAL or SECRET objects
   ```

2. **Purpose Limitation**: User purposes must intersect with object purposes
   ```typescript
   // User with purpose 'CTI_ANALYSIS' can access objects with purposes:
   // ['CTI_ANALYSIS'], ['CTI_ANALYSIS', 'REPORTING']
   // but NOT ['TRAINING'] only
   ```

3. **Need-to-Know Tags**: User must have ALL required tags
   ```typescript
   // Object requires ['TEAM_ALPHA', 'PROJECT_X']
   // User must have both tags (strict interpretation)
   ```

4. **License Restrictions**: EXPORT operations check license
   ```typescript
   // Object with licenseId='NO_EXPORT' cannot be exported
   ```

5. **Role-Based**: WRITE/DELETE require specific roles
   ```typescript
   // Only users with 'ADMIN', 'LEAD', or 'ANALYST' roles can write
   ```

**Access Decision:**
```typescript
{
  allow: false,
  reason: "User clearance level INTERNAL is insufficient for object sensitivity CONFIDENTIAL",
  metadata: {
    rulesEvaluated: ['sensitivity-clearance', 'purpose-limitation', 'need-to-know'],
    rulesMatched: [],
    evaluationTimeMs: 2
  }
}
```

---

## API Reference

### Temporal Helpers

| Function | Description |
|----------|-------------|
| `isValidAt(temporal, at)` | Check if valid at a point in time |
| `validityOverlaps(a, b)` | Check if two validity windows overlap |
| `isCurrent(temporal)` | Check if currently valid |
| `isBitemporallyValid(obj, validAt, recordedAt?)` | Bitemporal validation |
| `filterEntitiesAsOf(entities, at)` | Filter entities valid at time |
| `filterEdgesAsOf(edges, at)` | Filter edges valid at time |
| `buildGraphSnapshotAtTime(nodes, edges, at)` | Build graph snapshot |
| `getLatestVersionAt(entities, at)` | Get most recent version |
| `getValidityDuration(entity)` | Calculate validity duration |

### Policy Helpers

| Function | Description |
|----------|-------------|
| `checkAccess(input)` | Check access to an object |
| `filterByAccess(user, objects, operation)` | Filter objects by access |
| `batchCheckAccess(user, objects, operation)` | Batch access checks |
| `hasSufficientClearance(clearance, sensitivity)` | Check clearance level |
| `getHighestClearance(clearances)` | Get highest clearance |
| `isExportAllowed(licenseId, user)` | Check export license |
| `createDefaultUserContext(userId)` | Create minimal user context |
| `createAdminUserContext(userId)` | Create admin user context |

---

## Extension Guide

### Adding a New Entity Type

1. **Update `EntityType` union:**
   ```typescript
   export type EntityType =
     | 'Person'
     // ... existing types
     | 'MyNewType';
   ```

2. **Define props interface:**
   ```typescript
   export interface MyNewTypeProps {
     name: string;
     customField?: string;
   }
   ```

3. **Define entity interface:**
   ```typescript
   export interface MyNewType extends CanonicalEntity {
     entityType: 'MyNewType';
     props: MyNewTypeProps;
   }
   ```

4. **Add to union type:**
   ```typescript
   export type AnyCanonicalEntity =
     | Person
     // ... existing types
     | MyNewType;
   ```

5. **Add type guard:**
   ```typescript
   export function isMyNewType(entity: CanonicalEntity): entity is MyNewType {
     return entity.entityType === 'MyNewType';
   }
   ```

### Adding a New Edge Type

1. **Update `EdgeType` union:**
   ```typescript
   export type EdgeType =
     | 'communicatesWith'
     // ... existing types
     | 'myNewRelation';
   ```

2. **Define edge interface:**
   ```typescript
   export interface MyNewRelationEdge extends GraphEdge {
     type: 'myNewRelation';
     properties: {
       customProp?: string;
     };
   }
   ```

3. **Add to union:**
   ```typescript
   export type AnyGraphEdge =
     | CommunicatesWithEdge
     // ... existing types
     | MyNewRelationEdge
     | GraphEdge;
   ```

### Adding New Policy Rules

Edit `src/policy.ts` and add your rule in the `checkAccess` function:

```typescript
// Rule N: Check custom constraint
rulesEvaluated.push('my-custom-rule');
if (object.myCustomAttribute) {
  // Evaluate your rule
  if (!userMeetsCustomRequirement(user, object.myCustomAttribute)) {
    return {
      allow: false,
      reason: 'User does not meet custom requirement',
      metadata: { rulesEvaluated, rulesMatched, evaluationTimeMs: Date.now() - startTime },
    };
  }
  rulesMatched.push('my-custom-rule');
}
```

---

## Testing

Run tests:
```bash
pnpm test
```

Test files:
- `src/__tests__/temporal.test.ts` - Temporal query tests
- `src/__tests__/policy.test.ts` - Policy engine tests
- `src/__tests__/entity-validation.test.ts` - Entity validation tests

---

## GraphQL Integration

The package exports GraphQL type definitions in `graphql-types.ts`. To use in your GraphQL schema:

```typescript
import { canonicalEntityTypeDefs } from '@summit/canonical-entities';

const typeDefs = gql`
  ${canonicalEntityTypeDefs}

  # Your additional types...
`;
```

This provides GraphQL types for all 19 entity types plus bitemporal query support.

---

## Best Practices

### 1. Always Set Temporal Fields

```typescript
// ✅ Good: Set all temporal fields
const entity = {
  validFrom: new Date('2020-01-01'),
  validTo: null, // Explicitly set to null for "still valid"
  observedAt: new Date('2020-06-15'),
  recordedAt: new Date(), // System time when recorded
  // ...
};

// ❌ Bad: Omitting temporal fields
const entity = {
  // Missing temporal tracking
};
```

### 2. Use Policy Labels for Sensitive Data

```typescript
// ✅ Good: Apply appropriate sensitivity
const entity = {
  sensitivity: 'CONFIDENTIAL',
  purpose: ['CTI_ANALYSIS'],
  needToKnowTags: ['TEAM_ALPHA'],
  // ...
};

// ⚠️ Warning: Default to most restrictive if unsure
const entity = {
  sensitivity: 'SECRET', // When in doubt, be restrictive
  // ...
};
```

### 3. Filter Data at Query Time

```typescript
// ✅ Good: Filter based on user context
const visibleData = filterByAccess(userContext, allData, 'READ');
return visibleData;

// ❌ Bad: Returning all data without access checks
return allData; // Security violation!
```

### 4. Use Time-Travel for Audits

```typescript
// ✅ Good: Query historical state
const snapshot = buildGraphSnapshotAtTime(nodes, edges, investigationDate);
// "What did the graph look like on investigation date?"

// ✅ Good: Bitemporal audit
const knownAtTime = buildBitemporalGraphSnapshot(
  nodes, edges,
  new Date('2020-01-15'), // Valid time
  new Date('2020-02-01')  // Transaction time
);
// "What did we know on Feb 1st about facts true on Jan 15th?"
```

---

## Architecture Notes

### Why This Design?

1. **Strong Typing**: All entity types are discriminated unions, enabling TypeScript to provide excellent type safety and autocomplete.

2. **Bitemporal**: Separating "when it happened" from "when we learned about it" is critical for:
   - Forensic analysis
   - Audit trails
   - Retroactive corrections

3. **Policy Labels at Entity Level**: Embedding policy labels in entities/edges allows:
   - Row-level security
   - Purpose limitation (GDPR compliance)
   - Compartmentalization (need-to-know)

4. **ABAC over RBAC**: Attribute-based access control is more flexible than pure role-based for intelligence data with complex access rules.

### Performance Considerations

- **Temporal Queries**: For large datasets, consider indexing `validFrom`/`validTo` in your database
- **Policy Checks**: Cache user contexts to avoid repeated policy evaluations
- **Batch Operations**: Use `filterByAccess` instead of individual `checkAccess` calls when filtering collections

---

## License

MIT - see LICENSE file

---

## Support

For questions or issues, please file an issue in the repository or consult the team documentation.
