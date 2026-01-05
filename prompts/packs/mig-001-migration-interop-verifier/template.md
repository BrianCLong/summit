---
id: MIG-001
name: Migration & Interop Verifier (Legacy→Canonical)
slug: migration-interop-verifier
category: governance
subcategory: data-migration
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Creates a migration kit that maps legacy exports (CSV/JSON) into the canonical
  model and produces before/after diffs with schema mapping reports, ER replay,
  provenance backfill, and verifiable conclusions.

objective: |
  Enable verified migration from legacy systems with auditable proof that analytical
  conclusions remain unchanged post-migration.

tags:
  - migration
  - interoperability
  - stix
  - taxii
  - misp
  - provenance
  - verification

dependencies:
  services:
    - neo4j
    - postgresql
  packages:
    - "@intelgraph/graph"
    - "@intelgraph/prov-ledger"
  external:
    - "stix2@^3.0.0"
    - "ajv@^8.12.0"

deliverables:
  - type: cli
    description: Migration CLI tool with diff generation
  - type: service
    description: STIX/TAXII/MISP bridge adapters
  - type: tests
    description: Migration verification test suite
  - type: documentation
    description: Migration playbook and mapping guides

acceptance_criteria:
  - description: Legacy data imported without loss
    validation: Compare record counts and field coverage
  - description: Before/after conclusions match
    validation: Re-run analytical queries, verify same results
  - description: Provenance backfilled correctly
    validation: Check all migrated records have prov chain
  - description: Schema mapping report generated
    validation: Review mapping report for completeness

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - DQ-001
  - GOV-001
  - INT-001

blueprint_path: ../blueprints/templates/service
---

# Migration & Interop Verifier (Legacy→Canonical)

## Objective

Build a comprehensive migration toolkit that enables verified, auditable migration from legacy intelligence systems to the Summit/IntelGraph canonical model. The key requirement is **verifiable equivalence**: prove that analytical conclusions drawn from the legacy system remain valid post-migration.

## Prompt

**Create a migration kit that maps a legacy export (CSV/JSON) into the canonical model and then auto-produces a before/after diff with: schema mapping report, ER replay, provenance backfill, and verifiable 'same conclusions' checks. Support STIX/TAXII/MISP bridges and emit a signed migration manifest.**

### Core Requirements

**(a) Schema Mapping Engine**

Define mappings from legacy schemas to canonical model:

```yaml
# mapping.yml
source: legacy_system_v2
target: intelgraph_canonical_v1

entity_mappings:
  - source_type: "Person"
    target_type: "Person"
    field_mappings:
      full_name: "name"
      ssn: "attributes.ssn"
      dob: "attributes.dateOfBirth"
      nationality: "attributes.nationality"
    transforms:
      dob:
        type: date_parse
        format: "MM/DD/YYYY"
      nationality:
        type: lookup
        table: "country_codes"

  - source_type: "Organization"
    target_type: "Organization"
    field_mappings:
      org_name: "name"
      tax_id: "attributes.taxId"

relationship_mappings:
  - source_type: "Employment"
    target_type: "EMPLOYED_BY"
    source_field: "person_id"
    target_field: "organization_id"
    properties:
      start_date: "validFrom"
      end_date: "validTo"

provenance_strategy: "backfill_synthetic"
provenance_source: "migration_from_legacy_v2"
```

Implement mapping engine:
```typescript
interface MappingEngine {
  // Load mapping configuration
  loadMapping(config: MappingConfig): Promise<void>;

  // Transform legacy record to canonical
  transform(legacyRecord: any, recordType: string): Promise<CanonicalEntity | CanonicalRelationship>;

  // Validate transformed record
  validate(record: any): Promise<ValidationResult>;

  // Generate mapping report
  generateReport(): Promise<MappingReport>;
}
```

**(b) Before/After Diff Generator**

Compare legacy vs. canonical datasets:

```typescript
interface MigrationDiff {
  summary: {
    totalRecords: number;
    migrated: number;
    failed: number;
    warnings: number;
  };
  recordCounts: {
    legacy: { [type: string]: number };
    canonical: { [type: string]: number };
  };
  fieldCoverage: {
    entity: { [field: string]: { covered: number; total: number } };
    relationship: { [field: string]: { covered: number; total: number } };
  };
  unmappedFields: string[];
  dataQualityIssues: Array<{
    recordId: string;
    issue: string;
    severity: 'error' | 'warning';
  }>;
  analyticalEquivalence: {
    queriesRun: number;
    matching: number;
    divergent: number;
    divergences: Array<{
      query: string;
      legacyResult: any;
      canonicalResult: any;
      reason?: string;
    }>;
  };
}

// CLI: Generate diff
async function generateDiff(
  legacyExport: string,
  canonicalDb: string
): Promise<MigrationDiff> {
  // 1. Load legacy data
  const legacyData = await loadLegacy(legacyExport);

  // 2. Transform to canonical
  const canonicalData = await transformAll(legacyData);

  // 3. Import to Neo4j
  await importToGraph(canonicalData);

  // 4. Compare record counts
  const counts = await compareRecordCounts(legacyData, canonicalData);

  // 5. Run analytical queries on both
  const queryResults = await runComparisonQueries(legacyData, canonicalData);

  // 6. Generate report
  return {
    summary: { /* ... */ },
    recordCounts: counts,
    analyticalEquivalence: queryResults,
    // ...
  };
}
```

**(c) Entity-Relationship Replay**

Re-run canonical analytical queries against migrated data:

```typescript
interface ERReplay {
  // Define queries to verify equivalence
  queries: Array<{
    name: string;
    description: string;
    legacyQuery: string;  // SQL or legacy API call
    canonicalQuery: string;  // Cypher query
    equivalenceCheck: (legacyResult: any, canonicalResult: any) => boolean;
  }>;
}

const replayQueries: ERReplay = {
  queries: [
    {
      name: "Top 10 entities by connection count",
      description: "Verify most-connected entities remain same",
      legacyQuery: `
        SELECT entity_id, COUNT(relationship_id) as conn_count
        FROM relationships
        GROUP BY entity_id
        ORDER BY conn_count DESC
        LIMIT 10
      `,
      canonicalQuery: `
        MATCH (e:Entity)-[r]-(other)
        RETURN e.id, count(r) as conn_count
        ORDER BY conn_count DESC
        LIMIT 10
      `,
      equivalenceCheck: (legacy, canonical) => {
        // Allow for minor count differences (<5%)
        const legacyIds = legacy.map((r: any) => r.entity_id);
        const canonicalIds = canonical.map((r: any) => r['e.id']);
        const intersection = legacyIds.filter((id: string) => canonicalIds.includes(id));
        return intersection.length >= 8; // 80% overlap acceptable
      }
    },
    {
      name: "Shortest path between two entities",
      description: "Verify graph connectivity preserved",
      legacyQuery: `/* BFS in legacy system */`,
      canonicalQuery: `
        MATCH path = shortestPath((a:Entity {id: $startId})-[*]-(b:Entity {id: $endId}))
        RETURN length(path) as pathLength
      `,
      equivalenceCheck: (legacy, canonical) => {
        return legacy.pathLength === canonical.pathLength;
      }
    }
  ]
};

// Run all replay queries and report divergences
async function runERReplay(replayDef: ERReplay): Promise<ReplayResult> {
  const results = [];
  for (const query of replayDef.queries) {
    const legacyResult = await executeLegacyQuery(query.legacyQuery);
    const canonicalResult = await executeCanonicalQuery(query.canonicalQuery);
    const isEquivalent = query.equivalenceCheck(legacyResult, canonicalResult);
    results.push({
      query: query.name,
      equivalent: isEquivalent,
      legacyResult,
      canonicalResult
    });
  }
  return { results, allPassed: results.every(r => r.equivalent) };
}
```

**(d) Provenance Backfill**

Generate synthetic provenance for migrated records:

```typescript
interface ProvenanceBackfill {
  // Create synthetic prov chain for legacy data
  backfillProvenance(
    entity: CanonicalEntity,
    migrationMetadata: {
      sourceSystem: string;
      migrationDate: string;
      migrationJobId: string;
      originalRecordId: string;
    }
  ): Promise<ProvenanceChain>;
}

// Example provenance entry
const syntheticProv: ProvenanceEntry = {
  id: "prov-migration-abc123",
  activity: {
    type: "data_migration",
    description: `Migrated from ${metadata.sourceSystem}`,
    timestamp: metadata.migrationDate,
    actor: "migration_service",
    jobId: metadata.migrationJobId
  },
  entity: {
    id: entity.id,
    type: entity.type
  },
  wasAttributedTo: {
    agent: metadata.sourceSystem,
    role: "source_system"
  },
  wasDerivedFrom: {
    entity: metadata.originalRecordId,
    system: metadata.sourceSystem
  },
  signature: "...",  // Sign with migration service key
};
```

**(e) STIX/TAXII/MISP Bridge Support**

Implement adapters for common CTI formats:

**STIX 2.1 Adapter**:
```typescript
import { Bundle, STIXObject } from 'stix2';

interface STIXAdapter {
  // Import STIX bundle
  importBundle(bundle: Bundle): Promise<ImportResult>;

  // Export to STIX
  exportToSTIX(entityIds: string[]): Promise<Bundle>;

  // Map STIX SDO to canonical entity
  mapSTIXObject(stixObj: STIXObject): CanonicalEntity | CanonicalRelationship;
}

// Example mapping
function mapSTIXThreatActor(ta: ThreatActor): CanonicalEntity {
  return {
    id: ta.id,
    type: "ThreatActor",
    name: ta.name,
    attributes: {
      aliases: ta.aliases,
      sophistication: ta.sophistication,
      resourceLevel: ta.resource_level,
      primaryMotivation: ta.primary_motivation
    },
    validFrom: ta.valid_from,
    validTo: ta.valid_until
  };
}
```

**TAXII 2.1 Client**:
```typescript
interface TAXIIClient {
  // Discover TAXII server collections
  discoverCollections(serverUrl: string): Promise<Collection[]>;

  // Poll collection for new objects
  pollCollection(collectionId: string, addedAfter?: Date): Promise<Bundle>;

  // Push objects to TAXII server
  pushObjects(collectionId: string, objects: STIXObject[]): Promise<void>;
}
```

**MISP Adapter**:
```typescript
interface MISPAdapter {
  // Import MISP event
  importEvent(event: MISPEvent): Promise<ImportResult>;

  // Map MISP attribute to canonical
  mapAttribute(attr: MISPAttribute): CanonicalEntity;
}
```

**(f) Signed Migration Manifest**

Generate verifiable manifest:

```json
{
  "manifestId": "migration-manifest-2025-11-29-xyz",
  "migrationJob": {
    "id": "job-abc123",
    "startedAt": "2025-11-29T10:00:00Z",
    "completedAt": "2025-11-29T12:30:00Z",
    "sourceSystem": "legacy_v2",
    "targetSystem": "intelgraph_canonical_v1"
  },
  "summary": {
    "totalRecords": 50000,
    "migrated": 49500,
    "failed": 500,
    "warnings": 1200
  },
  "mappingConfigHash": "sha256:abc123...",
  "diff": { /* MigrationDiff object */ },
  "erReplay": { /* ReplayResult object */ },
  "provenanceBackfill": {
    "recordsBackfilled": 49500,
    "provenanceChainIds": ["prov-chain-1", "prov-chain-2", "..."]
  },
  "verification": {
    "analyticalEquivalence": true,
    "allQueriesPassed": true,
    "divergences": []
  },
  "signature": {
    "algorithm": "Ed25519",
    "publicKey": "...",
    "value": "..."
  },
  "checksums": {
    "sourceData": "sha256:source...",
    "canonicalData": "sha256:canonical...",
    "manifest": "sha256:manifest..."
  }
}
```

### Technical Specifications

**CLI Tool**:
```bash
# Migrate legacy export
migrate import \
  --source legacy-export.json \
  --mapping mapping.yml \
  --target neo4j://localhost:7687 \
  --output migration-manifest.json

# Generate diff report
migrate diff \
  --legacy legacy-db.sql \
  --canonical neo4j://localhost:7687 \
  --queries replay-queries.yml \
  --output diff-report.html

# Verify migration
migrate verify \
  --manifest migration-manifest.json \
  --queries replay-queries.yml

# Export to STIX
migrate export-stix \
  --entity-ids e-1,e-2,e-3 \
  --output bundle.json

# Import from TAXII
migrate import-taxii \
  --server https://taxii.example.com/api/ \
  --collection threat-actors \
  --added-after 2025-01-01
```

**Service Structure**:
```
services/migration-verifier/
├── src/
│   ├── mapping/
│   ├── diff/
│   ├── replay/
│   ├── provenance/
│   ├── adapters/
│   │   ├── STIXAdapter.ts
│   │   ├── TAXIIClient.ts
│   │   └── MISPAdapter.ts
│   └── cli/
├── tests/
│   ├── fixtures/
│   │   ├── legacy-exports/
│   │   ├── stix-bundles/
│   │   └── misp-events/
│   └── mapping-tests/
└── README.md
```

### Deliverables Checklist

- [x] Schema mapping engine
- [x] Before/after diff generator
- [x] ER replay query runner
- [x] Provenance backfill logic
- [x] STIX 2.1 adapter
- [x] TAXII 2.1 client
- [x] MISP adapter
- [x] Signed manifest generator
- [x] CLI tool (import/diff/verify/export)
- [x] Migration verification test suite
- [x] HTML diff report generator
- [x] README with migration playbook

### Acceptance Criteria

1. **Schema Mapping**
   - [ ] Import 1000-record legacy CSV
   - [ ] Verify all fields mapped correctly
   - [ ] Check unmapped fields reported

2. **Analytical Equivalence**
   - [ ] Run 10 comparison queries
   - [ ] Verify all results match (within tolerance)
   - [ ] Confirm divergence report empty

3. **Provenance Backfill**
   - [ ] Check all migrated records have prov chain
   - [ ] Verify chain links to source system
   - [ ] Confirm signatures valid

4. **STIX/TAXII**
   - [ ] Import STIX bundle
   - [ ] Export entities as STIX
   - [ ] Round-trip test (import → export → import)

5. **Signed Manifest**
   - [ ] Generate manifest
   - [ ] Verify signature
   - [ ] Validate checksums

## Implementation Notes

### Mapping Challenges

- **Semantic Drift**: Legacy "confidence" may not map 1:1 to canonical "confidence"
- **Schema Evolution**: Handle multiple legacy schema versions
- **Data Quality**: Legacy data may be incomplete/invalid
- **Identifiers**: Map legacy IDs to canonical UUIDs (maintain bidirectional lookup)

### Verification Strategy

- **Record Count Parity**: Easy check, but insufficient
- **Field Coverage**: Ensure no data loss
- **Analytical Equivalence**: Critical—run representative queries
- **Graph Structure**: Verify connectivity patterns preserved

### Performance

- Batch imports (1000 records/batch)
- Parallelize transformations
- Use Neo4j batch importer for large datasets
- Cache mapping lookups

## References

- [STIX 2.1 Specification](https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html)
- [TAXII 2.1 Specification](https://docs.oasis-open.org/cti/taxii/v2.1/taxii-v2.1.html)
- [MISP Core Format](https://www.misp-project.org/datamodels/)

## Related Prompts

- **DQ-001**: Data Quality Dashboard (for DQ checks post-migration)
- **GOV-001**: Policy Change Simulator (for testing policy impact on migrated data)
- **INT-001**: API Gateway (for exposing migrated data via GraphQL)
