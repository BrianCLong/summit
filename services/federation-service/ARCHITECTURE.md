# Federation Service Architecture

## Overview

The Federation Service implements secure, policy-bound cross-organization intelligence sharing for the IntelGraph platform.

## Design Principles

1. **Deny by Default**: Nothing is shared unless explicitly allowed
2. **Policy-First**: All operations gated by SharingAgreement evaluation
3. **Provenance Preservation**: Complete chain-of-custody tracking
4. **Audit Everything**: Comprehensive logging for compliance
5. **Tenant Isolation**: No direct cross-tenant access - all via federation

## Component Architecture

### Core Services

#### PolicyEvaluator
**Responsibility**: Evaluate if objects can be shared under an agreement

- Checks agreement status (ACTIVE required)
- Validates effective/expiration dates
- Verifies object type allowed
- Checks classification level hierarchy
- Validates jurisdiction constraints
- Computes required redactions

**Algorithm**:
```
evaluateShare(object, agreement):
  if agreement.status != ACTIVE:
    return DENY
  if now < effectiveDate or now > expirationDate:
    return DENY
  if object.type not in allowedObjectTypes:
    return DENY
  if object.classification > maxClassificationLevel:
    return DENY
  if object.jurisdiction not in allowedJurisdictions:
    return DENY
  redactions = computeRedactions(object, agreement)
  return ALLOW(redactions, requiresApproval)
```

#### RedactionEngine
**Responsibility**: Apply field-level transformations

Supported transformations:
- **Redact**: Replace with placeholder (e.g., `[REDACTED]`)
- **Pseudonymize**: Consistent hashing (e.g., "Person ABC12345")
- **Hash**: One-way SHA-256
- **Remove**: Delete field

**Features**:
- Deep object traversal via field paths (e.g., `personalInfo.ssn`)
- Pseudonym caching for consistency
- Type-specific transformations
- Validation of redaction correctness

#### ProvenanceTracker
**Responsibility**: Maintain chain-of-custody

Provenance chain entries:
1. Object selection
2. Policy evaluation (with result)
3. Redaction applied
4. Share transmitted

**Chain Verification**:
- First entry has no `previousEntry`
- All subsequent entries link to previous
- Timestamps are monotonic
- No breaks in chain

**ID Mapping**:
- Bidirectional source ↔ target ID mapping
- Preserves original IDs in shared objects
- Enables correlation across organizations

#### FederationManager
**Responsibility**: Orchestrate sharing workflows

**PUSH Model**:
```
pushShare(request, agreement):
  for each object:
    evaluation = policyEvaluator.evaluate(object, agreement)
    if not evaluation.allowed:
      skip object
    redacted = redactionEngine.apply(object, evaluation.redactions)
    shareRef = provenanceTracker.createShareReference(object)
    sharedObjects.add(redacted)

  package = createSharePackage(sharedObjects)
  auditLogger.log(SHARE_PUSH, package)
  return package
```

**PULL Model**:
```
pullQuery(query, agreement, availableObjects):
  filtered = filter(availableObjects, query.objectTypes, query.filter)
  paginated = paginate(filtered, query.offset, query.limit)

  for each object in paginated:
    evaluation = policyEvaluator.evaluate(object, agreement)
    if evaluation.allowed:
      redacted = redactionEngine.apply(object)
      results.add(redacted)

  auditLogger.log(SHARE_PULL, results)
  return results
```

**SUBSCRIPTION Model**:
```
deliverSubscription(subscription, agreement, objects):
  filtered = filter(objects, subscription.objectTypes, subscription.filter)

  for each object in filtered:
    evaluation = policyEvaluator.evaluate(object, agreement)
    if evaluation.allowed:
      redacted = redactionEngine.apply(object)
      results.add(redacted)

  package = createSharePackage(results)
  send(package, subscription.webhookUrl)
  auditLogger.log(SUBSCRIPTION_DELIVER, package)
  return package
```

#### AuditLogger
**Responsibility**: Comprehensive audit trail

Logs every operation with:
- Unique audit ID
- Timestamp (monotonic)
- Operation type
- User/partner/agreement context
- Object count and types
- Success/failure + error message
- Provenance IDs

**Query capabilities**:
- Filter by date range
- Filter by operation/agreement/partner/user
- Generate reports with aggregations

### Protocol Layer

#### FederationTransport
**Responsibility**: Secure message transport

**Message Signing**:
- Uses RSA-2048 keys
- JWT signatures with RS256 algorithm
- 5-minute signature validity (prevents replay)
- Nonce for uniqueness
- Sender verification

**mTLS Support**:
- Client certificate authentication
- CA validation
- Mutual authentication

**Delivery**:
- HTTPS POST to partner endpoint
- Signed message envelope
- Integrity hash verification

#### StixTaxiiMapper
**Responsibility**: STIX 2.1 / TAXII 2.1 interoperability

**Object Mappings**:
- IOC → STIX Indicator
- Entity → STIX Identity
- Relationship → STIX Relationship
- Alert/Case → STIX Incident
- Document → STIX Note
- Analysis → STIX Report

**TLP Marking**:
- UNCLASSIFIED → TLP:WHITE
- CUI → TLP:GREEN
- CONFIDENTIAL/SECRET → TLP:AMBER
- TOP_SECRET → TLP:RED

**External References**:
- Preserves original IntelGraph IDs
- Links to source organization

### API Layer

#### Express Routes

**POST /api/v1/share/push**
- Validates agreement ID
- Checks sharing mode (PUSH)
- Executes share via FederationManager
- Returns package ID

**GET /api/v1/share/pull**
- Validates agreement ID
- Checks sharing mode (PULL)
- Executes query via FederationManager
- Returns filtered objects

**POST /api/v1/agreements**
- Validates agreement schema
- Checks policy constraints
- Stores agreement
- Audits creation

**GET /api/v1/agreements/:id**
- Returns agreement by ID

**PUT /api/v1/agreements/:id**
- Updates agreement
- Revalidates constraints
- Audits modification

**GET /api/v1/audit**
- Queries audit logs
- Supports filtering
- Returns paginated results

## Data Models

### SharingAgreement

```typescript
{
  id: UUID
  name: string
  sourcePartnerId: UUID
  targetPartnerId: UUID
  status: DRAFT | PENDING_APPROVAL | ACTIVE | SUSPENDED | TERMINATED
  sharingMode: PUSH | PULL | SUBSCRIPTION

  policyConstraints: {
    maxClassificationLevel: UNCLASSIFIED | CUI | CONFIDENTIAL | SECRET | TOP_SECRET
    allowedJurisdictions: [US, EU, UK, FVEY, NATO, GLOBAL]
    allowedObjectTypes: [ENTITY, RELATIONSHIP, CASE, ALERT, IOC, DOCUMENT, ANALYSIS]
    redactionRules: RedactionRule[]
    licenseType: TLP_WHITE | TLP_GREEN | TLP_AMBER | TLP_RED | CUSTOM
    allowDownstreamSharing: boolean
    retentionPeriodDays?: number
    requiresApproval?: boolean
  }

  effectiveDate?: Date
  expirationDate?: Date
  approvedBy?: string
  approvedAt?: Date
}
```

### SharedObject

```typescript
{
  id: UUID
  type: ShareableObjectType
  data: Record<string, unknown> // Redacted
  classification: ClassificationLevel
  jurisdiction: Jurisdiction
  license: LicenseType
  originalId: string // Original ID in source system
  sourceOrganization: string
  createdAt: Date
  modifiedAt?: Date
  redactedFields?: string[]
  transformationApplied?: boolean
}
```

### SharePackage

```typescript
{
  id: UUID
  agreementId: UUID
  channelId?: UUID
  objects: SharedObject[]
  sharedAt: Date
  sharedBy: string
  signature?: string
  provenanceLinks: string[]
}
```

## Security Model

### Trust Boundaries

1. **Organization Boundary**: Between tenants/orgs
2. **Federation Boundary**: Between IntelGraph instances
3. **Internet Boundary**: Public network

### Security Controls

| Control | Implementation |
|---------|----------------|
| Authentication | Partner public key verification |
| Authorization | SharingAgreement policy evaluation |
| Confidentiality | TLS 1.3, optional mTLS |
| Integrity | JWT signatures, hash verification |
| Non-repudiation | Audit logs with provenance |
| Privacy | Redaction engine |

### Threat Model

**Threats**:
1. Unauthorized data access → **Mitigated by**: Policy evaluation
2. Data tampering → **Mitigated by**: Digital signatures
3. Replay attacks → **Mitigated by**: Nonce + timestamp
4. Over-sharing → **Mitigated by**: Deny-by-default
5. Audit bypass → **Mitigated by**: Mandatory logging

## Performance Considerations

### Scalability

- **Horizontal scaling**: Stateless API servers
- **Caching**: Agreement policy results (Redis)
- **Async processing**: Subscription deliveries (Kafka)

### Optimization Targets

- Policy evaluation: < 10ms per object
- Redaction: < 50ms per object
- Share package creation: < 500ms for 100 objects
- Audit log write: < 5ms

## Future Enhancements

1. **PostgreSQL Persistence**
   - Store agreements, partners, channels
   - Persistent audit logs
   - Share history

2. **Redis Caching**
   - Cache policy evaluation results
   - Cache partner public keys

3. **Kafka Integration**
   - Async subscription delivery
   - Event streaming for real-time federation

4. **OPA Integration**
   - Advanced policy evaluation
   - Rego-based rules

5. **Blockchain Provenance**
   - Immutable provenance anchoring
   - Cross-org verification

## Testing Strategy

### Unit Tests

- Policy evaluation logic (all branches)
- Redaction transformations
- Provenance chain operations
- Agreement validation

### Integration Tests

- End-to-end PUSH sharing
- End-to-end PULL queries
- Cross-tenant scenarios
- Redaction correctness
- Provenance integrity

### Performance Tests

- Load testing (1000 shares/sec)
- Policy evaluation latency
- Redaction throughput

## Compliance

### Audit Requirements

Every operation logged with:
- Who (user/partner)
- What (operation + objects)
- When (timestamp)
- Where (agreement + channel)
- Why (policy evaluation result)
- How (provenance chain)

### Data Governance

- Classification enforcement
- Jurisdiction boundaries
- License compliance (TLP)
- Retention policies
- Right to be forgotten (redaction)

---

**Version**: 1.0.0
**Last Updated**: 2024-11-29
