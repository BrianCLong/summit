# Universal Data Ingestion + ETL Assistant - Architecture

> **Tech Stack Inference**: TypeScript + Node.js (ESM), pnpm workspace, Turbo build system
> **Integration Points**: Existing connector-sdk, license-registry service, etl-framework

## 1. Overview

The Universal Data Ingestion + ETL Assistant provides a comprehensive, license-aware data ingestion and transformation system that integrates seamlessly with the existing Summit/IntelGraph platform.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Universal Ingestion Service              │
│                     (services/universal-ingestion)          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   HTTP API   │  │  GraphQL API │  │  Event Emitter  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌──────▼──────┐    ┌─────▼──────┐
    │Connector│      │ ETL Assistant│    │  Policy    │
    │Framework│      │     Core     │    │  Engine    │
    └─────────┘      └──────────────┘    └────────────┘
         │                  │                  │
    ┌────┴────┐      ┌──────┴──────┐    ┌─────┴──────┐
    │ CSV     │      │Schema       │    │  License   │
    │ REST    │      │Inference    │    │  Registry  │
    │ S3      │      │PII Detection│    │            │
    └─────────┘      └─────────────┘    └────────────┘
```

## 2. Component Details

### 2.1 Connector Framework (packages/connector-sdk)

**Status**: ✅ Already exists with comprehensive types and base classes

**Extensions Needed**:
- `CsvFileConnector`: CSV file ingestion
- `RestPullConnector`: REST API polling
- `S3BucketConnector`: S3/object storage ingestion

**Existing Patterns**:
- `BaseConnector`: Abstract base with lifecycle management
- `PullConnector`: Pull-based ingestion
- `ConnectorManifest`: Metadata and capabilities
- `ConnectorContext`: Runtime context with logging, metrics, rate limiting

### 2.2 ETL Assistant Core (packages/etl-assistant)

**Status**: 🆕 New package

**Responsibilities**:
1. **Schema Inference**
   - Analyze sample records
   - Detect field types and structure
   - Suggest canonical entity mappings
   - Field cardinality analysis

2. **PII Detection**
   - Pattern-based detection (regex)
   - Field name heuristics
   - Data sampling and analysis
   - Redaction strategy recommendations

3. **Canonical Entity Mapping**
   - Map to standard entities: `Person`, `Organization`, `Location`, `Event`, `Document`, `Indicator`
   - Field transformation rules
   - Confidence scoring

**Interfaces**:
```typescript
interface SchemaInferenceResult {
  entityType: string;
  confidence: number;
  fieldMappings: FieldMapping[];
  statistics: SampleStatistics;
}

interface PIIDetectionResult {
  piiFields: PIIField[];
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: RedactionRecommendation[];
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transformation?: string;
}
```

### 2.3 License Registry + Policy Engine (services/license-registry)

**Status**: ✅ Already exists with comprehensive compliance checking

**Extensions Needed**:
1. **Policy Engine Enhancement**
   - Operation-based decisions (`INGEST`, `EXPORT`, `SHARE`)
   - Context-aware evaluation
   - Structured `PolicyDecision` responses

**Existing Features**:
- License templates (CC-BY, Commercial, Research-Only)
- Compliance checking (`/compliance/check`)
- DPIA assessments
- Geographic restrictions
- TOS enforcement

**New Interfaces**:
```typescript
interface PolicyDecision {
  allow: boolean;
  reason: string;
  licenseId: string;
  context?: Record<string, unknown>;
}

type OperationType = 'INGEST' | 'EXPORT' | 'SHARE' | 'TRANSFORM';
```

### 2.4 Universal Ingestion Service (services/universal-ingestion)

**Status**: 🆕 New service

**Technology**: Fastify + TypeScript (following license-registry pattern)

**Endpoints**:

1. **POST /ingest/sources/:sourceId/sample**
   - Input: Sample records + licenseId + optional schemaHint
   - Output: Schema inference + PII detection + mapping suggestions

2. **POST /ingest/sources/:sourceId/register**
   - Input: Source config + connector type + licenseId + mappings
   - Output: Registered source + policy validation results

3. **POST /exports/check**
   - Input: licenseId + operation + context
   - Output: PolicyDecision (allow/deny + reason)

4. **POST /ingest/sources/:sourceId/pull**
   - Trigger ingestion for a registered source
   - Apply mappings and redaction policies
   - Emit to IngestEventBus

**Event Bus**: Abstract interface with in-memory implementation (Kafka-ready)

## 3. Data Flow

### 3.1 Sample & Analyze Flow

```
User → POST /ingest/sources/:sourceId/sample
  │
  ├─→ ETL Assistant: Schema Inference
  │    └─→ Detect entity type, field mappings
  │
  ├─→ ETL Assistant: PII Detection
  │    └─→ Identify sensitive fields, suggest redactions
  │
  └─→ Response: Inference + PII results + recommendations
```

### 3.2 Registration Flow

```
User → POST /ingest/sources/:sourceId/register
  │
  ├─→ License Registry: Validate license
  │    └─→ Check DPIA requirements, restrictions
  │
  ├─→ Policy Engine: Evaluate INGEST operation
  │    └─→ Allow/Deny based on license terms
  │
  ├─→ Persist: Source config + mappings + redaction policy
  │
  └─→ Response: Registration status + warnings
```

### 3.3 Ingestion Flow

```
Scheduler/User → POST /ingest/sources/:sourceId/pull
  │
  ├─→ Load connector (CSV/REST/S3)
  │    └─→ Pull raw data
  │
  ├─→ Apply mappings (ETL Assistant)
  │    └─→ Transform to canonical entities
  │
  ├─→ Apply redaction policy
  │    └─→ MASK/DROP/HASH PII fields
  │
  ├─→ Policy check (License Registry)
  │    └─→ Verify INGEST allowed
  │
  ├─→ Emit to IngestEventBus
  │    └─→ Kafka topic or in-memory queue
  │
  └─→ Response: Ingestion result (counts, errors, cursor)
```

### 3.4 Export Check Flow

```
User → POST /exports/check
  │
  ├─→ Policy Engine: Evaluate EXPORT operation
  │    │
  │    ├─→ Load license for data source
  │    ├─→ Check export_allowed restriction
  │    ├─→ Check audience/jurisdiction context
  │    └─→ Apply license compliance_level
  │
  └─→ Response: PolicyDecision (allow/deny + reason)
```

## 4. Canonical Entity Types

```typescript
// Core canonical entities
type CanonicalEntityType =
  | 'Person'
  | 'Organization'
  | 'Location'
  | 'Event'
  | 'Document'
  | 'Indicator';

interface CanonicalEntity {
  type: CanonicalEntityType;
  externalId: string;
  props: Record<string, unknown>;
  confidence: number;
  sourceMeta: {
    connectorId: string;
    sourceId: string;
    licenseId: string;
    ingestedAt: string;
    piiRedacted: boolean;
  };
}
```

## 5. PII Detection Heuristics

### 5.1 Regex Patterns

- **Email**: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/`
- **Phone**: `/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/`
- **Credit Card**: `/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/`
- **SSN/National ID**: `/\b\d{3}-\d{2}-\d{4}\b/` (configurable per region)

### 5.2 Field Name Heuristics

Suspicious field names:
- `email`, `mail`, `e_mail`
- `ssn`, `social_security`, `national_id`, `passport`
- `phone`, `mobile`, `tel`, `telephone`
- `dob`, `date_of_birth`, `birthdate`
- `address`, `street`, `zip`, `postal_code`
- `credit_card`, `cc_number`, `card_number`

### 5.3 Redaction Strategies

- **MASK**: `john.doe@example.com` → `j***@e***.com`
- **DROP**: Remove field entirely
- **HASH**: `john.doe@example.com` → `sha256(...)`

## 6. License Policy Rules

### 6.1 Example Licenses

**Open Data License**:
```json
{
  "licenseId": "open-data-cc-by",
  "restrictions": {
    "commercial_use": true,
    "export_allowed": true,
    "research_only": false
  },
  "allowedOperations": ["INGEST", "EXPORT", "SHARE"]
}
```

**Restricted Partner License**:
```json
{
  "licenseId": "partner-internal-only",
  "restrictions": {
    "commercial_use": true,
    "export_allowed": false,
    "research_only": false,
    "internal_only": true
  },
  "allowedOperations": ["INGEST"],
  "blockedOperations": ["EXPORT", "SHARE"]
}
```

### 6.2 Policy Evaluation Logic

```typescript
function evaluatePolicy(
  operation: OperationType,
  licenseId: string,
  context?: Record<string, unknown>
): PolicyDecision {
  const license = getLicense(licenseId);

  // INGEST: Generally allowed unless explicitly forbidden
  if (operation === 'INGEST') {
    return { allow: true, reason: 'Ingestion permitted', licenseId };
  }

  // EXPORT: Check export_allowed + audience restrictions
  if (operation === 'EXPORT') {
    if (!license.restrictions.export_allowed) {
      return {
        allow: false,
        reason: 'Export not permitted under license terms',
        licenseId
      };
    }

    if (license.restrictions.internal_only && context?.audience !== 'internal') {
      return {
        allow: false,
        reason: 'License restricts use to internal audience only',
        licenseId
      };
    }
  }

  // SHARE: Similar checks with additional jurisdiction validation
  if (operation === 'SHARE') {
    // Check geographic restrictions...
  }

  return { allow: true, reason: 'Operation complies with license', licenseId };
}
```

## 7. Implementation Plan

### Phase 1: Connectors (Completed after this task)
1. ✅ `CsvFileConnector` - Read CSV from filesystem/stream
2. ✅ `RestPullConnector` - Poll REST APIs with pagination
3. ✅ `S3BucketConnector` - Read from S3/object storage

### Phase 2: ETL Assistant (Completed after this task)
1. ✅ Schema inference module
2. ✅ PII detection module
3. ✅ Canonical entity mapper

### Phase 3: Policy Engine (Completed after this task)
1. ✅ Enhance license-registry with policy engine
2. ✅ Add example licenses
3. ✅ Context-aware evaluation

### Phase 4: Ingestion Service (Completed after this task)
1. ✅ Fastify service setup
2. ✅ API endpoints
3. ✅ Event bus abstraction

### Phase 5: Testing (Completed after this task)
1. ✅ Connector tests
2. ✅ ETL tests
3. ✅ Policy tests
4. ✅ Integration tests

## 8. Non-Functional Requirements

### 8.1 Strong Typing
- All interfaces defined with TypeScript
- No `any` types (strict null checks where appropriate)
- Zod schemas for runtime validation

### 8.2 Dependency Injection
- PolicyEngine injectable
- LicenseRegistry injectable
- IngestEventBus injectable
- Connectors factory-based

### 8.3 Configuration & Secrets
- Environment variables via `.env`
- Connector credentials in secrets store
- Kafka/bus endpoints configurable

### 8.4 Observability
- Structured logging (Pino)
- Metrics (OpenTelemetry compatible)
- Health checks
- Audit trails

## 9. Integration with Existing Platform

### 9.1 Connector SDK Integration
- Extend existing `BaseConnector`, `PullConnector` classes
- Use existing `ConnectorManifest`, `ConnectorContext` types
- Leverage rate limiting, metrics, logging infrastructure

### 9.2 License Registry Integration
- Use existing `/compliance/check` endpoint
- Leverage DPIA assessment workflow
- Extend with policy engine module

### 9.3 Event Bus Integration
- Abstract interface: `IngestEventBus`
- Default in-memory implementation
- Kafka adapter for production (future)

## 10. File Structure

```
summit/
├── packages/
│   ├── connector-sdk/           # Existing
│   │   └── src/
│   │       ├── connectors/      # NEW: Concrete connectors
│   │       │   ├── csv-file-connector.ts
│   │       │   ├── rest-pull-connector.ts
│   │       │   └── s3-bucket-connector.ts
│   │       └── __tests__/
│   │           └── connectors/
│   └── etl-assistant/           # NEW: ETL core logic
│       ├── package.json
│       └── src/
│           ├── schema-inference.ts
│           ├── pii-detection.ts
│           ├── canonical-mapper.ts
│           ├── types.ts
│           └── __tests__/
├── services/
│   ├── license-registry/        # Existing - enhance with policy engine
│   │   └── src/
│   │       ├── index.ts         # Existing endpoints
│   │       └── policy-engine.ts # NEW: Policy evaluation
│   └── universal-ingestion/     # NEW: Main ingestion service
│       ├── package.json
│       └── src/
│           ├── index.ts         # Fastify server
│           ├── routes/
│           │   ├── sample.ts
│           │   ├── register.ts
│           │   └── ingest.ts
│           ├── event-bus.ts     # Abstract event bus
│           └── __tests__/
└── docs/
    └── universal-ingestion-etl-architecture.md  # This file
```

## 11. Success Criteria

✅ **Connector Framework**:
- Three working connectors (CSV, REST, S3)
- Unit tests with >80% coverage
- Sample connector configurations

✅ **ETL Assistant**:
- Schema inference with entity type detection
- PII detection with configurable patterns
- Canonical mapping with confidence scores
- Test coverage >80%

✅ **Policy Engine**:
- Operation-based policy decisions
- Context-aware evaluation
- Integration with license registry
- Test coverage >80%

✅ **Ingestion Service**:
- All HTTP endpoints functional
- Event bus abstraction working
- Integration with connectors + ETL + policy
- End-to-end tests passing

✅ **Documentation**:
- Architecture doc (this file)
- API documentation
- Connector development guide
- Usage examples

---

**Next Steps**: Begin implementation starting with connectors, then ETL Assistant, then policy engine, then ingestion service, and finally comprehensive tests.
