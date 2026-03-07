# SOC 2 PI1.5 - Processing Integrity at System Boundaries

> **Control:** The entity implements policies and procedures to ensure that inputs and outputs are complete, accurate, timely, and valid to meet the entity's objectives.
>
> **Category:** Processing Integrity
> **Domain:** Data Validation
> **Epic:** GA-E3: API Contracts

## Control Objective

Ensure all API inputs and outputs conform to documented contracts, with validation at system boundaries to maintain data integrity.

## System Boundaries

### Boundary Definition

**Input Boundary:** Client requests entering the API

- HTTP requests to REST endpoints
- GraphQL queries/mutations
- Request headers (including versioning)

**Output Boundary:** API responses returning to clients

- HTTP responses from REST endpoints
- GraphQL query results
- Response headers (including version metadata)

**Validation Points:**

1. Request version detection and validation
2. Request schema conformance (OpenAPI/GraphQL)
3. Response schema conformance
4. Version-specific contract enforcement

## Contract Specifications

### GraphQL Contract

**Location:** `/api-schemas/v{VERSION}/graphql-schema-v{VERSION}.graphql`

**Defines:**

- All types and fields
- Required vs optional fields
- Field types and nullability
- Input validation rules
- Output structure guarantees

**Enforcement:**

- GraphQL runtime validation
- Schema snapshot comparison
- Breaking change detection

**Evidence:**

- Schema snapshots (immutable)
- SHA256 hashes for integrity
- Version metadata

### OpenAPI Contract

**Location:** `/api-schemas/v{VERSION}/openapi-spec-v{VERSION}.json`

**Defines:**

- REST endpoint paths
- HTTP methods
- Request parameters (path, query, header, body)
- Request body schemas
- Response codes and schemas
- Authentication requirements

**Enforcement:**

- Request validation middleware
- Response validation (dev/test)
- Schema diff on changes

**Evidence:**

- OpenAPI spec snapshots
- Validation error logs
- Diff reports

## Input Validation

### Version Detection

**Mechanism:** API version middleware validates all requests

**Implementation:** `/server/src/middleware/api-version.ts`

**Validates:**

- Version format (v1, v2, etc.)
- Version is supported (not sunset)
- Version matches endpoint availability

**Error Handling:**

- Invalid version → 400 Bad Request
- Sunset version → 410 Gone
- Deprecated version → 200 OK with warning headers

**Evidence:**

```typescript
// Priority order:
// 1. URL path (/api/v1/)
// 2. Accept-Version header
// 3. API-Version header
// 4. Default (v1)

if (isSunset) {
  return res.status(410).json({
    error: "version_sunset",
    currentVersion: versionKey,
    latestVersion: latestVersion,
  });
}
```

### Request Schema Validation

**GraphQL:**

- Built-in GraphQL validation
- Type checking on all inputs
- Required field enforcement
- Custom scalar validation

**REST:**

- JSON schema validation (via Zod)
- Request body validation
- Query parameter validation
- Path parameter validation

**Example:** `/server/src/coherence/routes.ts`

```typescript
const SignalIngestSchema = z.object({
  tenantId: z.string().min(1),
  type: z.string().min(1),
  value: z.number().min(-1000).max(1000),
  // ... complete validation
});

const validatedInput = SignalIngestSchema.parse(req.body);
```

## Output Validation

### Response Contract Conformance

**Mechanism:** Schema snapshots define guaranteed outputs

**Validation:**

- Response structure matches OpenAPI spec
- GraphQL response matches schema
- No fields removed without version bump
- Type safety maintained

**Monitoring:**

- Schema drift detection
- Unexpected field warnings
- Type mismatch alerts

### Version Headers

**Required Headers:** All responses include version metadata

```http
X-API-Version: v1.0.0
X-API-Latest-Version: v1
X-API-Version-Detection: url
X-API-Deprecation: false
```

**Purpose:**

- Client awareness of version used
- Deprecation warnings
- Version detection method transparency
- Latest version availability

**Evidence:** Response header logs, client analytics

### Response Completeness

**Guarantees:**

- All documented fields present
- No breaking schema changes
- Consistent error format
- Predictable status codes

**Example Error Format:**

```json
{
  "error": "validation_error",
  "message": "Invalid request format",
  "details": [...],
  "timestamp": "2025-12-27T12:00:00Z"
}
```

## Contract Change Management

### Immutable Snapshots

**Purpose:** Baseline for contract validation

**Contents:**

- GraphQL schema (complete)
- OpenAPI specification (complete)
- Version metadata with hashes

**Properties:**

- Immutable (git-controlled)
- SHA256 hashed for integrity
- Timestamped
- Version-tagged

**Evidence:**

```json
{
  "version": "v1",
  "schemaHash": {
    "graphql": "sha256:d917320558d8df5aa3b2d0d4f091bff582261bd8ed98250ca78980a75fd78c42",
    "openapi": "sha256:6207a49038728ea0a8664af4e9a06b235330eb6ae1390d1e3162dcc435e6c3d4"
  }
}
```

### Breaking Change Prevention

**Mechanism:** Automated diff blocks unauthorized changes

**Process:**

1. Developer modifies schema
2. PR triggers schema diff
3. Diff categorizes changes
4. Breaking changes blocked unless version bumped
5. Audit log records decision

**Validation:**

- Field removal = breaking
- Type change = breaking (usually)
- Required field addition = breaking
- Endpoint removal = breaking

**Evidence:** CI workflow, diff reports, merge blocks

## Validation Evidence

### Input Validation Evidence

| Validation Type    | Evidence Location | Retention |
| ------------------ | ----------------- | --------- |
| Version validation | Middleware logs   | 90 days   |
| Schema validation  | Error logs        | 90 days   |
| Request validation | Application logs  | 90 days   |
| Rate limiting      | Rate limit logs   | 30 days   |

### Output Validation Evidence

| Validation Type     | Evidence Location | Retention  |
| ------------------- | ----------------- | ---------- |
| Schema conformance  | Diff reports      | 7 years    |
| Response headers    | Access logs       | 90 days    |
| Error formatting    | Error logs        | 90 days    |
| Contract compliance | Schema snapshots  | Indefinite |

### Contract Management Evidence

| Artifact         | Purpose             | Retention  |
| ---------------- | ------------------- | ---------- |
| Schema snapshots | Contract baseline   | Indefinite |
| Diff reports     | Change validation   | 7 years    |
| Audit logs       | Authorization trail | 7 years    |
| Version registry | Lifecycle tracking  | Indefinite |

## Control Testing

### Test 1: Invalid Input Rejection

**Test Procedure:**

1. Send request with invalid version (v999)
2. Observe response
3. Verify proper error returned
4. Verify no processing occurred

**Expected Result:**

- ❌ Request rejected
- ✅ 400 Bad Request status
- ✅ Clear error message
- ✅ No side effects

**Evidence:** Request/response logs, error analytics

### Test 2: Sunset Version Blocking

**Test Procedure:**

1. Configure v0 as sunset in registry
2. Send request to /api/v0/endpoint
3. Observe response
4. Verify HTTP 410 Gone

**Expected Result:**

- ❌ Request blocked
- ✅ 410 Gone status
- ✅ Migration guide included
- ✅ Latest version indicated

**Evidence:** Middleware logs, response examples

### Test 3: Response Contract Conformance

**Test Procedure:**

1. Query GraphQL endpoint
2. Validate response against schema
3. Verify all fields match types
4. Verify no undocumented fields

**Expected Result:**

- ✅ Response matches schema exactly
- ✅ All types correct
- ✅ No schema drift
- ✅ Version headers present

**Evidence:** Response validation logs, schema snapshots

### Test 4: Breaking Change Detection

**Test Procedure:**

1. Remove field from schema
2. Create PR
3. Run schema diff
4. Verify blocking

**Expected Result:**

- ✅ Breaking change detected
- ✅ Categorized as critical
- ✅ Merge blocked
- ✅ Version bump required

**Evidence:** Diff reports, CI logs, blocked PR

## Monitoring and Alerting

### Validation Metrics

- **Input validation errors:** Count by error type
- **Version distribution:** % of requests per version
- **Sunset version attempts:** Count of blocked requests
- **Schema validation failures:** Rate and patterns

### Alert Conditions

- ⚠️ Spike in validation errors (>5% of requests)
- ⚠️ Requests to sunset versions (immediate)
- ⚠️ Schema drift detected (schema ≠ snapshot)
- ⚠️ Missing version headers in responses

### Dashboard Metrics

1. **Request Validation Rate:** % of requests passing validation
2. **Version Compliance:** % of requests with explicit version
3. **Deprecation Awareness:** % of clients on deprecated versions
4. **Contract Stability:** Days since last breaking change

## Continuous Improvement

### Weekly Reviews

- Validation error patterns
- Client integration issues
- Schema drift incidents
- Version migration progress

### Quarterly Audits

- Contract completeness
- Snapshot integrity (hash verification)
- Version registry accuracy
- Evidence retention compliance

## Related Controls

- **CC8.1:** Change Management (contract changes)
- **CC3.1:** Risk Management (impact assessment)
- **CC7.2:** System Monitoring (validation metrics)

## Revision History

| Date       | Version | Changes                               | Author        |
| ---------- | ------- | ------------------------------------- | ------------- |
| 2025-12-27 | 1.0     | Initial processing integrity controls | Platform Team |

---

**Status:** ✅ Implemented and Operational
**Next Review:** 2026-06-27
**Owner:** Platform Engineering Team
