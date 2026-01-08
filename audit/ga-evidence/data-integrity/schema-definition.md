# Data Envelope Schema Definition

**Epic:** GA-E2: Data Integrity
**Date:** 2025-12-27
**Control Mapping:** PI1.1, PI1.2, PI1.4, C1.2
**Status:** Implemented

## Overview

The Data Envelope standardizes all API responses to include provenance, confidence scores, simulation flags, and governance verdicts. This ensures complete data integrity and auditability for all system operations, particularly AI-generated content.

## Schema Definition

### GraphQL Schema

Location: `/home/user/summit/server/src/graphql/schema/data-envelope.graphql`

```graphql
type DataEnvelope {
  data: JSON!
  provenance: Provenance!
  confidence: Float
  isSimulated: Boolean!
  governanceVerdict: GovernanceVerdict
  classification: DataClassification!
  dataHash: String!
  signature: String
  warnings: [String!]!
}

type Provenance {
  source: String!
  generatedAt: DateTime!
  lineage: [LineageNode!]!
  actor: String
  version: String
  provenanceId: ID!
}

type LineageNode {
  id: ID!
  operation: String!
  inputs: [ID!]!
  timestamp: DateTime!
  actor: String
  metadata: JSON
}

enum DataClassification {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  RESTRICTED
  HIGHLY_RESTRICTED
}
```

### TypeScript Type Definition

Location: `/home/user/summit/server/src/types/data-envelope.ts`

```typescript
export interface DataEnvelope<T = any> {
  data: T;
  provenance: Provenance;
  confidence?: number;
  isSimulated: boolean;
  governanceVerdict?: GovernanceVerdict;
  classification: DataClassification;
  dataHash: string;
  signature?: string;
  warnings: string[];
}
```

## Key Features

### 1. Provenance Tracking

Every response includes:

- **source**: Originating system/model identifier
- **generatedAt**: ISO 8601 timestamp
- **lineage**: Complete transformation chain
- **actor**: User or system that initiated the operation
- **provenanceId**: Unique identifier for audit trail

### 2. Confidence Scoring

For AI-generated content:

- **Range**: 0.0 to 1.0
- **Interpretation**:
  - `>= 0.8`: High confidence
  - `0.5 - 0.8`: Medium confidence
  - `< 0.5`: Low confidence (manual review recommended)
- **null**: Non-AI generated content

### 3. Simulation Flag

- **isSimulated**: Boolean flag indicating synthetic/test data
- **Enforcement**: Production environments reject simulated data
- **Use Cases**: Testing, demos, development environments

### 4. Data Classification

Five-level classification system:

- **PUBLIC**: Publicly shareable
- **INTERNAL**: Internal use only
- **CONFIDENTIAL**: Restricted access
- **RESTRICTED**: Highly sensitive (PII, financial)
- **HIGHLY_RESTRICTED**: Maximum security (admin, security)

### 5. Integrity Hash

- **Algorithm**: SHA-256
- **Coverage**: Entire data payload
- **Purpose**: Tamper detection
- **Verification**: Client and server-side validation

### 6. Governance Verdict

Optional reference to policy evaluation:

- **verdictId**: Unique decision identifier
- **policyId**: Evaluated policy
- **result**: ALLOW/DENY/FLAG/REVIEW_REQUIRED
- **reason**: Decision explanation
- **evaluator**: Human or automated system

## Implementation Locations

### Backend

- **Schema**: `/home/user/summit/server/src/graphql/schema/data-envelope.graphql`
- **Types**: `/home/user/summit/server/src/types/data-envelope.ts`
- **Resolvers**: `/home/user/summit/server/src/resolvers/data-envelope-resolvers.ts`
- **Middleware**: `/home/user/summit/server/src/middleware/data-envelope-middleware.ts`
- **Exports**: `/home/user/summit/server/src/exports/data-envelope-export.ts`

### Frontend

- **Validator**: `/home/user/summit/client/src/utils/data-envelope-validator.ts`
- **UI Components**: `/home/user/summit/client/src/components/DataIntegrityIndicators.tsx`

## Compliance Controls

### SOC 2 Mapping

| Control   | Description                           | Implementation                                   |
| --------- | ------------------------------------- | ------------------------------------------------ |
| **PI1.1** | Processing Integrity - Completeness   | All responses include provenance and lineage     |
| **PI1.2** | Processing Integrity - Timeliness     | Timestamps at generation and each transformation |
| **PI1.4** | Processing Integrity - Validity       | Hash verification and confidence scoring         |
| **C1.2**  | Confidentiality - Data Classification | Five-level classification system                 |

## Usage Examples

See `/home/user/summit/audit/ga-evidence/data-integrity/example-responses.json`

## Verification

Integrity can be verified by:

1. Checking provenance.provenanceId is present
2. Validating isSimulated flag is set
3. Verifying dataHash matches payload
4. Confirming confidence score (if AI-generated) is within 0-1
5. Checking classification is appropriate for use case

## Backward Compatibility

- Existing endpoints continue to work
- New envelope-based endpoints use `-WithEnvelope` suffix
- Middleware can be selectively applied
- Client validation is opt-in via interceptors

## Audit Trail

All envelope operations are logged with:

- Provenance ID
- Actor
- Operation
- Classification
- Confidence
- Simulation status
- Data hash

Log location: Server audit logs (stdout + audit database)
