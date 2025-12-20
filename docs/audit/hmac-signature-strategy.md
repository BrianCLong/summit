# HMAC Signature Strategy for Audit Events

## Overview

This document describes the HMAC (Hash-based Message Authentication Code) signature strategy used in the comprehensive audit system to ensure tamper detection and cryptographic integrity of audit events.

## Goals

1. **Tamper Detection**: Detect any unauthorized modification of audit events
2. **Integrity Verification**: Provide cryptographic proof that events haven't been altered
3. **Non-Repudiation**: Prevent denial of logged actions
4. **Chain of Custody**: Maintain provable chain of custody for forensic analysis
5. **Performance**: Minimize overhead while maintaining security

## Architecture

### Two-Layer Integrity Protection

The audit system uses a **two-layer approach** for maximum security:

1. **Event-Level HMAC Signature**: Each event is individually signed
2. **Blockchain-Style Hash Chain**: Events are linked via hash chains

```
Event 1          Event 2          Event 3
┌──────┐         ┌──────┐         ┌──────┐
│ Data │         │ Data │         │ Data │
│ Hash │────────>│ Hash │────────>│ Hash │
│ HMAC │         │ HMAC │         │ HMAC │
└──────┘         └──────┘         └──────┘
   │                │                │
   └────────────────┴────────────────┘
    previousEventHash references
```

## HMAC Signature Algorithm

### Primary Algorithm: HMAC-SHA256

**Why HMAC-SHA256?**
- **Security**: SHA-256 is cryptographically secure and FIPS 140-2 approved
- **Performance**: Fast computation suitable for high-volume audit logging
- **Compatibility**: Widely supported across platforms
- **Future-Proof**: 256-bit security margin resistant to quantum attacks (for now)
- **Timing-Safe**: Constant-time comparison prevents timing attacks

### Alternative Algorithms (Configurable)

- **HMAC-SHA512**: For extra security margin (slower, larger signatures)
- **RSA-SHA256**: For public/private key scenarios (verification without secret)

## HMAC Key Management

### Signing Key Requirements

```typescript
// Environment variable
process.env.LEDGER_SIGNING_KEY
```

**Key Properties:**
- **Length**: Minimum 32 bytes (256 bits), recommended 64 bytes (512 bits)
- **Entropy**: Cryptographically random (use crypto.randomBytes())
- **Encoding**: Base64 or hex
- **Rotation**: Support for key rotation without breaking verification

### Key Generation

```bash
# Generate a secure signing key
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Example:**
```bash
LEDGER_SIGNING_KEY=Xp3K9mN2vB8qR5tY7wZ4jA6dF1gH8kL0oP2sU5xC7eI9nM1vN3bQ8rT5yW7zA4d
```

### Key Storage

**Development:**
- Store in `.env` file (gitignored)

**Staging/Production:**
- **AWS Secrets Manager**: Rotate automatically every 90 days
- **HashiCorp Vault**: Transit secret engine for signing operations
- **Azure Key Vault**: Managed HSM for FIPS 140-2 Level 3 compliance

**Key Rotation Strategy:**
```typescript
interface SigningKeyConfig {
  keyId: string;          // Key version identifier
  key: string;            // Actual signing key
  algorithm: string;      // HMAC-SHA256, HMAC-SHA512, RSA-SHA256
  validFrom: Date;        // Key activation date
  validUntil?: Date;      // Key expiration (null = active)
  rotatedBy?: string;     // Admin who rotated
}

// Store multiple keys for verification during rotation
const signingKeys: Map<string, SigningKeyConfig> = new Map();
```

### Key Rotation Process

1. **Generate New Key**: Create new key with unique `keyId`
2. **Dual-Write Period**: Sign with new key, verify with old and new (30 days)
3. **Cutover**: Switch to verifying only with new key
4. **Archive Old Key**: Move old key to secure archive for historical verification

## Event Hashing

### Hash Calculation

Each audit event is hashed using **SHA-256** to create a unique fingerprint.

**Hashable Fields** (order matters):
```typescript
const hashableData = {
  id: event.id,
  eventType: event.eventType,
  timestamp: event.timestamp.toISOString(),
  correlationId: event.correlationId,
  tenantId: event.tenantId,
  serviceId: event.serviceId,
  userId: event.userId,
  action: event.action,
  outcome: event.outcome,
  resourceType: event.resourceType,
  resourceId: event.resourceId,
  message: event.message,
  details: event.details,
  oldValues: event.oldValues,
  newValues: event.newValues,
};

// Canonical JSON (sorted keys)
const canonical = JSON.stringify(
  hashableData,
  Object.keys(hashableData).sort()
);

const hash = crypto.createHash('sha256')
  .update(canonical)
  .digest('hex');
```

**Why Canonical JSON?**
- **Deterministic**: Same data always produces same hash
- **Sorted Keys**: Prevents key order variations
- **Reproducible**: Can recalculate hash for verification

## HMAC Signature Generation

### Signature Payload

The HMAC signature covers:
```typescript
const signaturePayload = {
  id: event.id,
  hash: event.hash,                    // Content hash
  timestamp: event.timestamp.toISOString(),
  tenantId: event.tenantId,            // Prevent cross-tenant replay
  previousEventHash: event.previousEventHash,  // Chain linkage
  keyId: currentKeyId,                 // Key version
};
```

### Signature Calculation

```typescript
import { createHmac } from 'crypto';

function signEvent(
  event: AuditEvent,
  signingKey: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  const payload = {
    id: event.id,
    hash: event.hash,
    timestamp: event.timestamp.toISOString(),
    tenantId: event.tenantId,
    previousEventHash: event.previousEventHash || '',
  };

  const canonical = JSON.stringify(
    payload,
    Object.keys(payload).sort()
  );

  return createHmac(algorithm, signingKey)
    .update(canonical)
    .digest('hex');
}
```

### Signature Verification

```typescript
import { timingSafeEqual } from 'crypto';

function verifyEventSignature(
  event: AuditEvent,
  signingKey: string
): boolean {
  try {
    // Recalculate signature
    const expectedSignature = signEvent(event, signingKey);

    // Timing-safe comparison (prevents timing attacks)
    const eventSigBuffer = Buffer.from(event.signature || '', 'hex');
    const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');

    if (eventSigBuffer.length !== expectedSigBuffer.length) {
      return false;
    }

    return timingSafeEqual(eventSigBuffer, expectedSigBuffer);
  } catch (error) {
    return false;
  }
}
```

**Why Timing-Safe Comparison?**
- Prevents timing side-channel attacks
- Standard comparison leaks information via execution time
- `timingSafeEqual()` always takes constant time

## Hash Chain Integrity

### Chain Construction

Each event links to the previous event via `previousEventHash`:

```typescript
let lastEventHash = '';  // In-memory state

async function recordEvent(eventData: Partial<AuditEvent>) {
  // 1. Calculate event hash
  event.hash = calculateEventHash(event);

  // 2. Link to previous event
  event.previousEventHash = lastEventHash;

  // 3. Update last hash (for next event)
  lastEventHash = event.hash;

  // 4. Sign the complete event
  event.signature = signEvent(event, signingKey);

  // 5. Store in database
  await storeEvent(event);
}
```

### Chain Verification

```typescript
async function verifyHashChain(
  startTime: Date,
  endTime: Date,
  tenantId?: string
): Promise<{
  valid: boolean;
  totalEvents: number;
  chainBreaks: number;
  firstBreakEventId?: string;
}> {
  const events = await queryEvents({
    startTime,
    endTime,
    tenantIds: tenantId ? [tenantId] : undefined,
  });

  let expectedPreviousHash = '';
  let chainBreaks = 0;
  let firstBreakEventId: string | undefined;

  for (const event of events) {
    // 1. Verify event hash
    const calculatedHash = calculateEventHash(event);
    if (event.hash !== calculatedHash) {
      chainBreaks++;
      if (!firstBreakEventId) firstBreakEventId = event.id;
      continue;
    }

    // 2. Verify signature
    if (!verifyEventSignature(event, signingKey)) {
      chainBreaks++;
      if (!firstBreakEventId) firstBreakEventId = event.id;
      continue;
    }

    // 3. Verify chain linkage
    if (expectedPreviousHash && event.previousEventHash !== expectedPreviousHash) {
      chainBreaks++;
      if (!firstBreakEventId) firstBreakEventId = event.id;
    }

    expectedPreviousHash = event.hash!;
  }

  return {
    valid: chainBreaks === 0,
    totalEvents: events.length,
    chainBreaks,
    firstBreakEventId,
  };
}
```

### Chain Break Detection

**Types of Chain Breaks:**

1. **Hash Mismatch**: Event content was modified
   - Detection: Recalculated hash ≠ stored hash
   - Severity: CRITICAL (tampered event)

2. **Signature Invalid**: Signature doesn't match
   - Detection: HMAC verification fails
   - Severity: CRITICAL (unauthorized modification)

3. **Chain Link Broken**: Previous hash doesn't match
   - Detection: previousEventHash ≠ expected
   - Severity: CRITICAL (event deleted or reordered)

4. **Missing Event**: Gap in sequence numbers
   - Detection: Sequence number discontinuity
   - Severity: HIGH (event deletion)

## Write-Once File Support

### Append-Only File Format

In addition to database storage, audit events are appended to a **write-once file** for additional tamper protection.

**File Location:**
```bash
/var/log/audit/audit-trail-{TENANT_ID}-{YYYY-MM-DD}.log
```

**File Format** (JSONL - JSON Lines):
```json
{"seq":1,"ts":"2025-01-15T10:30:00.000Z","id":"123e4567-e89b-12d3-a456-426614174000","type":"user_login","hash":"abc123...","sig":"def456...","prevHash":"","data":"eyJpZCI6...","crc":"789abc"}
{"seq":2,"ts":"2025-01-15T10:30:05.000Z","id":"223e4567-e89b-12d3-a456-426614174001","type":"entity_create","hash":"ghi789...","sig":"jkl012...","prevHash":"abc123...","data":"eyJpZCI6...","crc":"345def"}
```

**Entry Fields:**
- `seq`: Sequence number (monotonically increasing)
- `ts`: Timestamp (ISO 8601)
- `id`: Event UUID
- `type`: Event type
- `hash`: SHA-256 hash
- `sig`: HMAC signature
- `prevHash`: Previous event hash (chain link)
- `data`: Base64-encoded full event JSON
- `crc`: CRC32 checksum of line (additional integrity)

### File Permissions

```bash
# Create audit log directory
sudo mkdir -p /var/log/audit
sudo chown audit-service:audit-service /var/log/audit
sudo chmod 700 /var/log/audit

# Set immutable flag (Linux)
sudo chattr +a /var/log/audit/audit-trail-*.log  # Append-only
```

**immutable flag (+a):**
- Files can only be appended to (no modifications or deletions)
- Requires root to remove flag
- Provides OS-level tamper protection

### File Rotation

```bash
# Daily rotation
/var/log/audit/audit-trail-{TENANT_ID}-2025-01-15.log
/var/log/audit/audit-trail-{TENANT_ID}-2025-01-16.log
/var/log/audit/audit-trail-{TENANT_ID}-2025-01-17.log
```

**Rotation Process:**
1. New file created at midnight UTC
2. Old file is sealed (made read-only)
3. Old file is checksummed and signed
4. Checksum stored in database
5. File archived to S3 with encryption

## SOC 2 Compliance

### Trust Services Criteria Mapping

| SOC 2 Control | Implementation |
|---------------|----------------|
| **CC6.1** - Implements logical access controls | HMAC signatures prevent unauthorized modifications |
| **CC7.2** - System monitoring | Hash chain verification detects tampering |
| **CC8.1** - Change management | Before/after states track all changes |
| **A1.2** - Audit trail protection | Append-only logs + immutable flags |
| **A1.3** - Integrity verification | Automated daily integrity checks |

### Audit Evidence

**For SOC 2 auditors:**

1. **Integrity Verification Reports**
   ```sql
   SELECT * FROM integrity_verifications
   WHERE verified_at >= NOW() - INTERVAL '90 days'
   ORDER BY verified_at DESC;
   ```

2. **Hash Chain Verification**
   ```sql
   SELECT * FROM verify_hash_chain(
     NOW() - INTERVAL '1 month',
     NOW(),
     'tenant-123'
   );
   ```

3. **Failed Verification Alerts**
   - All integrity failures trigger PagerDuty alerts
   - Incident response within 15 minutes (SLA)

4. **Key Rotation Logs**
   ```sql
   SELECT * FROM audit_events
   WHERE event_type = 'config_change'
     AND details->>'config_key' = 'signing_key'
   ORDER BY timestamp DESC;
   ```

## Performance Considerations

### Throughput Benchmarks

- **HMAC-SHA256**: ~100,000 signatures/sec (single core)
- **Hash-SHA256**: ~150,000 hashes/sec (single core)
- **Batch Processing**: 100 events batched every 5 seconds
- **Target**: 10,000 audit events/sec sustained

### Optimization Strategies

1. **Batch Signing**: Sign events in batches
2. **Async Processing**: Non-blocking signature computation
3. **Worker Threads**: Parallelize signing for high volume
4. **Signature Caching**: Cache recent signatures (5 min TTL)
5. **Lazy Verification**: Verify on-demand, not on every read

### Memory Management

```typescript
class AuditService {
  private eventBuffer: AuditEvent[] = [];
  private lastEventHash: string = '';
  private flushInterval: NodeJS.Timeout;

  constructor() {
    // Flush every 5 seconds or when buffer reaches 100 events
    this.flushInterval = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEventBuffer();
      }
    }, 5000);
  }

  private async flushEventBuffer(): Promise<void> {
    const eventsToFlush = this.eventBuffer.splice(0, 100);

    // Batch insert to database
    await this.db.batchInsert('audit_events', eventsToFlush);

    // Batch append to write-once file
    await this.appendToAuditFile(eventsToFlush);
  }
}
```

## Security Best Practices

### 1. Key Protection

- **Never** log the signing key
- **Never** expose the signing key in API responses
- **Never** commit the signing key to version control
- Store keys in secrets management systems
- Rotate keys every 90 days

### 2. Signature Verification

- Always use `timingSafeEqual()` for comparison
- Verify signatures before processing events
- Log all signature verification failures
- Alert on multiple consecutive failures

### 3. Hash Chain Integrity

- Run daily integrity checks automatically
- Alert on any chain breaks immediately
- Store verification results in audit trail
- Require manual investigation for any failures

### 4. Access Control

- Limit signature verification to authorized services
- Prevent direct database access to audit tables
- Use row-level security (RLS) for tenant isolation
- Audit all access to audit logs (meta-auditing)

### 5. Monitoring

- Track signature verification failures
- Monitor hash chain integrity
- Alert on anomalous event volumes
- Dashboard for audit health metrics

## Implementation Checklist

- [ ] Generate secure signing key (64 bytes minimum)
- [ ] Store signing key in secrets manager (Vault/AWS Secrets Manager)
- [ ] Implement event hash calculation (SHA-256)
- [ ] Implement HMAC signature generation (HMAC-SHA256)
- [ ] Implement timing-safe signature verification
- [ ] Implement hash chain linking (previousEventHash)
- [ ] Implement batch event flushing (5 sec interval)
- [ ] Implement write-once file appending
- [ ] Set append-only flag on audit log files
- [ ] Implement daily hash chain verification
- [ ] Configure PagerDuty alerts for verification failures
- [ ] Create Grafana dashboard for audit metrics
- [ ] Document key rotation procedures
- [ ] Train ops team on incident response
- [ ] Schedule quarterly SOC 2 evidence collection

## References

- [RFC 2104 - HMAC: Keyed-Hashing for Message Authentication](https://tools.ietf.org/html/rfc2104)
- [FIPS 180-4 - Secure Hash Standard (SHS)](https://csrc.nist.gov/publications/detail/fips/180/4/final)
- [FIPS 198-1 - The Keyed-Hash Message Authentication Code (HMAC)](https://csrc.nist.gov/publications/detail/fips/198/1/final)
- [SOC 2 Trust Services Criteria](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [NIST SP 800-57 - Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
