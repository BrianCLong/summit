# DLP-Aware Feature Checklist

> **Purpose**: Use this checklist to ensure new features are properly integrated with Data Loss Prevention (DLP) and Information Barrier controls.
>
> **When to Use**: Before deploying any feature that handles, displays, transfers, or stores data.

---

## Quick Assessment

Answer these questions to determine DLP requirements:

| Question | Yes → Action Required |
|----------|----------------------|
| Does the feature handle user-provided content? | Content inspection at ingestion |
| Does the feature display data to users? | Classification-aware rendering |
| Does the feature export or download data? | Egress controls and redaction |
| Does the feature share data between users? | Barrier enforcement |
| Does the feature transfer data externally? | Cross-boundary controls |
| Does the feature store data? | Encryption and classification labels |
| Does the feature search across data? | Access control in queries |
| Does the feature aggregate data? | Aggregation risk assessment |

---

## ✅ Feature is DLP-Aware If...

### 1. Content Inspection

- [ ] **Ingestion scanning enabled**
  - All user uploads pass through DLP scanner
  - File content is inspected, not just metadata
  - Async scanning for large files with quarantine

- [ ] **Pattern detection configured**
  - PII patterns (SSN, CC, email, phone) detected
  - API keys and secrets detected
  - Custom patterns for domain-specific data

- [ ] **Classification applied**
  - Data is classified on ingestion
  - Classification labels stored with data
  - Classification propagates to derived data

```typescript
// Example: Ingestion with DLP
const result = await dlpService.scan({
  content: uploadedFile,
  contentType: file.mimetype,
  context: {
    actor: currentUser,
    purpose: 'FILE_UPLOAD',
  },
});

if (!result.allowed) {
  throw new DLPBlockedError(result.violations);
}
```

### 2. Access Control Integration

- [ ] **Authorization checks include classification**
  - User clearance verified against data classification
  - Role-based access respects data sensitivity
  - Step-up authentication for sensitive data

- [ ] **Barrier checks on data access**
  - Tenant isolation enforced
  - Business unit walls respected
  - Environment boundaries checked

- [ ] **Context-aware access**
  - Purpose of access considered
  - Location/network restrictions applied
  - Temporal restrictions enforced

```typescript
// Example: Barrier-aware data access
const barrierResult = await barrierEnforcer.check({
  source: dataLocation,
  target: requestContext,
  actor: currentUser,
  resource: dataResource,
  operation: 'READ',
});

if (!barrierResult.allowed) {
  await auditService.logViolation(barrierResult);
  throw new BarrierViolationError(barrierResult.violations);
}
```

### 3. Display and Rendering

- [ ] **Classification-aware UI**
  - Sensitive data visually indicated
  - Redaction applied before display
  - Copy/paste restrictions for sensitive content

- [ ] **Field-level redaction**
  - PII fields masked by default
  - Reveal requires authorization
  - Redaction strategy matches data type

- [ ] **Context banners**
  - Classification level displayed
  - Handling requirements shown
  - Export restrictions indicated

```typescript
// Example: Redacted display
const displayData = await redactionEngine.redact({
  content: rawData,
  detections: scanResult.detections,
  configs: {
    SSN: { strategy: 'FULL_MASK' },
    EMAIL: { strategy: 'PARTIAL_DOMAIN' },
  },
});
```

### 4. Export and Download

- [ ] **Egress scanning**
  - All exports pass through DLP
  - Destination risk assessed
  - Volume limits enforced

- [ ] **Redaction on export**
  - Automatic redaction for sensitive fields
  - Configurable redaction levels
  - Audit trail of what was redacted

- [ ] **Approval workflows**
  - Bulk exports require approval
  - Cross-boundary exports flagged
  - Justification required and recorded

- [ ] **Watermarking and tracking**
  - Exported documents watermarked
  - Export tracked in audit log
  - Recipient recorded

```typescript
// Example: Controlled export
const exportResult = await dlpService.scan({
  content: exportData,
  context: {
    operation: 'EXPORT',
    destination: { type: 'EXTERNAL', domain: targetDomain },
    volume: { recordCount: records.length },
  },
});

if (exportResult.action === 'REQUIRE_APPROVAL') {
  return await initiateApprovalWorkflow(exportRequest);
}
```

### 5. Sharing and Collaboration

- [ ] **Recipient verification**
  - Recipient authorization checked
  - Cross-tenant sharing blocked by default
  - Business unit walls enforced

- [ ] **Share-specific controls**
  - Time-limited access options
  - View-only restrictions
  - Download prevention

- [ ] **Notification and consent**
  - Data owner notified of shares
  - Recipient acknowledges handling requirements
  - Sharing logged comprehensively

### 6. Storage and Persistence

- [ ] **Encryption at rest**
  - Sensitive data encrypted
  - Key management integrated
  - Encryption level matches classification

- [ ] **Classification metadata**
  - Classification stored with data
  - Categories and handling requirements persisted
  - Lineage tracked for derived data

- [ ] **Retention policies**
  - Retention period enforced
  - Deletion policies applied
  - Crypto-shred for highly sensitive

```typescript
// Example: Classified storage
await storageService.store({
  data: encryptedContent,
  metadata: {
    classification: 'CONFIDENTIAL',
    categories: ['PII', 'FINANCIAL'],
    retentionDays: 365 * 3,
    deletionPolicy: 'CRYPTO_SHRED',
  },
});
```

### 7. Search and Query

- [ ] **Access-filtered results**
  - Search results filtered by authorization
  - Sensitive fields excluded from full-text index
  - Aggregation risks considered

- [ ] **Query auditing**
  - All queries logged
  - Sensitive data access tracked
  - Unusual patterns detected

- [ ] **Result redaction**
  - Search snippets redacted
  - Preview content sanitized
  - Full access requires click-through

### 8. API and Integration

- [ ] **API-level DLP**
  - Request/response scanning
  - Rate limiting for bulk operations
  - Destination validation for webhooks

- [ ] **Integration controls**
  - Third-party integrations vetted
  - Data flow to external systems controlled
  - API keys and tokens managed securely

- [ ] **GraphQL/REST considerations**
  - Field-level authorization
  - Query depth limiting
  - Batch request controls

```typescript
// Example: DLP middleware
app.use('/api/*', dlpMiddleware.inspect({
  inspectionPoints: ['request', 'response'],
  asyncMode: false,
  failOpen: false,
}));
```

### 9. Audit and Compliance

- [ ] **Comprehensive logging**
  - All DLP decisions logged
  - Actor, action, data, outcome recorded
  - Immutable audit trail

- [ ] **Compliance reporting**
  - Reports for GDPR, CCPA, HIPAA available
  - Exception usage tracked
  - Policy violation metrics

- [ ] **Incident support**
  - Forensic data available
  - Chain of custody maintained
  - Breach detection capabilities

```typescript
// Example: Audit logging
await auditService.log({
  eventType: 'EGRESS_SCAN',
  actor: currentUser,
  resource: exportedData,
  policy: {
    policyId: 'cross-region-pii',
    decision: 'ALLOW',
    redactionsApplied: ['SSN', 'EMAIL'],
  },
  outcome: {
    action: 'REDACT',
    destination: targetSystem,
  },
});
```

### 10. Error Handling

- [ ] **Graceful degradation**
  - DLP failures don't crash the feature
  - Fail-closed for sensitive operations
  - Clear error messages without data leakage

- [ ] **User feedback**
  - Clear explanation of blocks
  - Remediation guidance provided
  - Appeal/exception process accessible

- [ ] **Monitoring**
  - DLP errors tracked
  - Alert on repeated failures
  - Dashboard for DLP health

---

## Integration Checklist by Feature Type

### File Upload Feature
- [ ] Scan file content before storage
- [ ] Classify based on content
- [ ] Apply appropriate encryption
- [ ] Enforce size and type limits
- [ ] Quarantine suspicious files

### Data Export Feature
- [ ] Apply egress scanning
- [ ] Enforce volume limits
- [ ] Require justification for bulk
- [ ] Add watermarks
- [ ] Log all exports

### Search Feature
- [ ] Filter results by authorization
- [ ] Redact snippets
- [ ] Limit result counts
- [ ] Audit search queries
- [ ] Prevent data mining

### Sharing Feature
- [ ] Verify recipient authorization
- [ ] Check information barriers
- [ ] Apply share-specific controls
- [ ] Notify data owner
- [ ] Enable time-limited access

### API Endpoint
- [ ] Add DLP middleware
- [ ] Validate destinations
- [ ] Rate limit requests
- [ ] Scan payloads
- [ ] Log all calls

### Report/Dashboard
- [ ] Aggregate appropriately
- [ ] Redact sensitive details
- [ ] Enforce access by role
- [ ] Watermark exports
- [ ] Track views

---

## Testing Requirements

### Unit Tests
- [ ] Detection engine correctly identifies patterns
- [ ] Redaction produces expected output
- [ ] Barrier checks return correct decisions

### Integration Tests
- [ ] DLP middleware blocks sensitive content
- [ ] Redacted data displays correctly
- [ ] Audit events are recorded

### E2E Tests
- [ ] Full flow with DLP enabled
- [ ] Block scenarios handled gracefully
- [ ] Approval workflows function

### Security Tests
- [ ] Bypass attempts blocked
- [ ] Edge cases handled
- [ ] Error messages don't leak data

---

## Documentation Requirements

- [ ] DLP behavior documented for users
- [ ] Admin configuration guide
- [ ] API documentation includes DLP responses
- [ ] Runbook for DLP incidents
- [ ] Training materials updated

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Security Review | | | |
| Privacy Review | | | |
| QA | | | |

---

## Quick Reference: Common Patterns

### Block on Detection
```typescript
const result = await dlpService.scan(request);
if (result.action === 'BLOCK') {
  throw new DLPBlockedError(result.violations);
}
```

### Redact Before Display
```typescript
const safe = await redactionEngine.redact({
  content: data,
  detections: scanResult.detections,
});
return safe.redactedContent;
```

### Check Barrier
```typescript
const allowed = await barrierEnforcer.check({
  source, target, actor, resource, operation
});
if (!allowed.allowed) {
  throw new BarrierViolationError(allowed.violations);
}
```

### Require Justification
```typescript
if (result.action === 'REQUIRE_JUSTIFICATION') {
  return { requiresJustification: true, fields: result.obligations };
}
```

### Audit Everything
```typescript
await auditService.log({
  eventType: 'EGRESS_SCAN',
  actor, resource, policy, outcome
});
```

---

**Version**: 1.0.0
**Last Updated**: 2025-12-07
**Owner**: Security & Privacy Team
