# @summit/canonical-schema

Canonical graph schema and entity resolution types for Summit/IntelGraph platform.

## Overview

This package provides the **single source of truth** for all entity and relationship types in the Summit platform. It implements the GA-ready canonical schema aligned with the Council Wishbook ontology.

## Features

- **23 canonical entity types** (Person, Organization, Location, Asset, Account, Event, Document, Communication, Device, Vehicle, Infrastructure, FinancialInstrument, Indicator, Claim, Case, Narrative, Campaign, License, Authority, Sensor, Runbook, Evidence, Hypothesis)
- **30+ relationship types** including evidence chains, authority bindings, and temporal sequences
- **Built-in provenance tracking** with full assertion chains
- **Policy-by-default** with 7 mandatory policy labels (origin, sensitivity, clearance, legal basis, need-to-know, purpose limitation, retention class)
- **Bitemporal support** (validFrom/validTo + observedAt/recordedAt)
- **Entity Resolution (ER) types** with explainable scorecards and manual review queues

## Installation

```bash
cd packages/canonical-schema
npm install
npm run build
```

## Usage

### Import Types

```typescript
import {
  CanonicalEntityBase,
  CanonicalEntityType,
  PersonEntity,
  OrganizationEntity,
  ERMatchScore,
  ERDecision,
  ResolutionCluster,
} from '@summit/canonical-schema';
```

### Create a Person Entity

```typescript
import { PersonEntity, CanonicalEntityType, SensitivityLevel, ClearanceLevel, RetentionClass, VerificationStatus } from '@summit/canonical-schema';

const person: PersonEntity = {
  id: 'person-001',
  tenantId: 'tenant-acme',
  type: CanonicalEntityType.PERSON,
  label: 'John Doe',
  description: 'Software Engineer',
  properties: {},
  confidence: 0.95,
  source: 'hrms',
  provenance: {
    sourceId: 'hrms-connector',
    assertions: [],
    verificationStatus: VerificationStatus.VERIFIED,
    trustScore: 0.95,
  },
  policyLabels: {
    origin: 'hrms',
    sensitivity: SensitivityLevel.INTERNAL,
    clearance: ClearanceLevel.AUTHORIZED,
    legalBasis: 'employee-data-processing',
    needToKnow: ['hr', 'management'],
    purposeLimitation: ['hr-operations'],
    retentionClass: RetentionClass.LONG_TERM,
  },
  validFrom: new Date('2020-01-01'),
  validTo: undefined, // Still valid
  observedAt: new Date('2020-01-02'),
  recordedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  version: 1,

  // Person-specific fields
  names: [
    { value: 'John Doe', type: 'legal', confidence: 1.0 },
    { value: 'Johnny', type: 'nickname', confidence: 0.8 },
  ],
  identifiers: [
    { type: 'ssn', value: '123-45-6789', country: 'US', confidence: 1.0 },
    { type: 'employee_id', value: 'EMP-12345', confidence: 1.0 },
  ],
  contactInfo: [
    { type: 'email', value: 'john.doe@acme.com', primary: true, confidence: 1.0 },
    { type: 'phone', value: '+1-555-0123', primary: true, confidence: 0.9 },
  ],
  demographics: {
    dateOfBirth: new Date('1985-06-15'),
    dateOfBirthPrecision: 'day',
    gender: 'M',
    nationality: ['US'],
    occupation: 'Software Engineer',
  },
};
```

### Entity Resolution Workflow

```typescript
import { ERScoringService, ERDecisionService } from '@summit/canonical-schema';

const scoringService = new ERScoringService();
const decisionService = new ERDecisionService();

// Extract features and score
const features = extractFeatures(personA, personB); // Your feature extraction logic
const matchScore = scoringService.computeWeightedScore({
  entityAId: personA.id,
  entityBId: personB.id,
  features,
  method: 'hybrid',
  modelVersion: 'person-er-v1.0',
});

// Route decision based on thresholds
const thresholds = decisionService.getDefaultThresholds(CanonicalEntityType.PERSON);
const decision = await decisionService.routeDecision(matchScore, thresholds, CanonicalEntityType.PERSON);

if (decision.decision === 'MERGE') {
  console.log('Auto-merge approved');
} else if (decision.reviewRequired) {
  console.log('Manual review required');
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Canonical Schema Layer (TypeScript)               │
│  packages/canonical-schema/                                 │
│  - core/base.ts      (Base types)                          │
│  - entities/*.ts     (Entity specializations)              │
│  - er/types.ts       (ER pipeline types)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (imports & codegen)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌──────────────────┐
│  GraphQL SDL  │   │  Neo4j Schema │   │  PostgreSQL DDL  │
│  Auto-gen     │   │  Constraints  │   │  Migrations      │
└───────────────┘   └───────────────┘   └──────────────────┘
```

## Entity Types

All 23 Wishbook entity types:

| Type | Description | Example Use Cases |
|------|-------------|-------------------|
| PERSON | Individual person | HUMINT, HR records, suspects |
| ORGANIZATION | Company, government entity | Corporate intelligence, partners |
| LOCATION | Physical location | Geospatial analysis, assets |
| ASSET | Physical/digital asset | Equipment, data, IP |
| ACCOUNT | User/financial account | Banking, system access |
| EVENT | Temporal event | Incidents, meetings, transactions |
| DOCUMENT | Document/file | Evidence, reports, contracts |
| COMMUNICATION | Message/call | Email, phone, chat |
| DEVICE | Hardware device | IoT, servers, endpoints |
| VEHICLE | Vehicle/vessel | Transportation, logistics |
| INFRASTRUCTURE | Critical infrastructure | Power, telecom, transport |
| FINANCIAL_INSTRUMENT | Financial product | Securities, derivatives |
| INDICATOR | IOC/TTP | Threat intelligence |
| CLAIM | Assertion/finding | Intelligence claims |
| CASE | Investigation case | Case management |
| NARRATIVE | Analytical narrative | Reports, briefings |
| CAMPAIGN | Operation/campaign | Threat campaigns, ops |
| LICENSE | License/warrant | Legal authorization |
| AUTHORITY | Legal authority | Regulations, policies |
| SENSOR | Data source/sensor | Telemetry, collectors |
| RUNBOOK | Operational procedure | Playbooks, SOPs |
| EVIDENCE | Evidence artifact | Court exhibits |
| HYPOTHESIS | Hypothesis/theory | ACH analysis |

## Relationship Types

30+ relationship types including:

### Core Relationships
- CONNECTED_TO, OWNS, WORKS_FOR, LOCATED_AT, MENTIONS, COMMUNICATES_WITH, TRANSACTED_WITH, ACCESSED, CREATED, MODIFIED, RELATED_TO, MEMBER_OF, MANAGES, REPORTS_TO, SUBSIDIARY_OF, PARTNER_OF, COMPETITOR_OF, SIMILAR_TO

### Evidence & Provenance (NEW)
- SUPPORTS, CONTRADICTS, DERIVED_FROM, CITES

### Authority & Governance (NEW)
- AUTHORIZED_BY, GOVERNED_BY, REQUIRES

### Temporal Sequences (NEW)
- PRECEDES, FOLLOWS, CONCURRENT_WITH

### Hypothesis Relationships (NEW)
- EXPLAINS, ALTERNATIVE_TO, REFUTES

## ER Pipeline

### Key Interfaces

- **ERCandidate**: Candidate pair for comparison
- **ERFeatureScore**: Individual feature score with explanation
- **ERMatchScore**: Weighted aggregate score
- **ERDecision**: Routing decision (MERGE/NO_MERGE/DEFER)
- **ERReviewQueueItem**: Manual review queue item
- **ResolutionCluster**: Merged entity cluster with provenance

### GA Precision Requirements

| Entity Type | Target Precision | Auto-Merge Threshold |
|-------------|------------------|----------------------|
| PERSON | 90% | 0.90 |
| ORGANIZATION | 88% | 0.88 |
| LOCATION | 85% | 0.85 |
| ASSET | 82% | 0.82 |

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Contributing

See the [design document](../../docs/design/canonical-graph-entity-resolution.md) for architecture details.

## License

MIT
