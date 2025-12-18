---
id: GOV-002
name: Retention, Purge & Disclosure Proofs (Dual-Control)
slug: retention-purge-disclosure
category: governance
subcategory: data-lifecycle
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Creates a retention engine with dual-control deletes, legal holds, and verifiable
  purge manifests. Bundles selective disclosure packager with audience-filtered
  bundles and auto-revoke on source change.

objective: |
  Ensure compliant data lifecycle management with cryptographic proof of deletion
  and controlled disclosure capabilities.

tags:
  - retention
  - purge
  - disclosure
  - compliance
  - legal-hold
  - dual-control
  - hash-trees

dependencies:
  services:
    - postgresql
    - neo4j
  packages:
    - "@intelgraph/prov-ledger"
    - "@intelgraph/audit"

deliverables:
  - type: service
    description: Retention engine with purge workflows
  - type: cli
    description: Disclosure packaging CLI
  - type: tests
    description: Purge verification test suite
  - type: documentation
    description: Compliance playbook

acceptance_criteria:
  - description: Dual-control delete requires two approvers
    validation: Attempt single-approver delete, verify blocked
  - description: Legal hold prevents deletion
    validation: Place hold, attempt delete, verify blocked
  - description: Purge manifest verifiable
    validation: Verify Merkle proof for deleted records
  - description: Disclosure bundle audience-filtered
    validation: Generate bundle, verify only authorized data included

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - GOV-001
  - MIG-001
  - EDGE-001

blueprint_path: ../blueprints/templates/service
---

# Retention, Purge & Disclosure Proofs (Dual-Control)

## Objective

Implement compliant data lifecycle management with cryptographic guarantees. Support dual-control deletion, legal holds, verifiable purge proofs, and selective disclosure with automatic revocation on source changes.

## Prompt

**Create a retention engine with dual-control deletes, legal holds, and verifiable purge manifests (hash trees). Bundle a selective disclosure packager that builds audience-filtered bundles and auto-revokes on source change; log everything to a provenance ledger.**

### Core Requirements

**(a) Dual-Control Delete Workflow**

Two-person rule for sensitive deletions:

```typescript
interface DualControlDelete {
  // Initiate delete request
  requestDelete(
    recordIds: string[],
    requestor: User,
    justification: string
  ): Promise<DeleteRequest>;

  // Approve delete (second person)
  approveDelete(
    requestId: string,
    approver: User
  ): Promise<DeleteRequest>;

  // Execute deletion (only after dual approval)
  executePurge(requestId: string): Promise<PurgeManifest>;
}

interface DeleteRequest {
  id: string;
  recordIds: string[];
  requestor: User;
  justification: string;
  approver?: User;
  status: 'pending' | 'approved' | 'denied' | 'executed';
  createdAt: Date;
  approvedAt?: Date;
  executedAt?: Date;
}

// Workflow
// 1. Analyst requests delete
const request = await dualControl.requestDelete(
  ['e-123', 'e-456'],
  currentUser,
  'Records duplicated in error'
);

// 2. Supervisor approves
await dualControl.approveDelete(request.id, supervisor);

// 3. System executes purge
const manifest = await dualControl.executePurge(request.id);
```

**(b) Legal Hold Management**

Prevent deletion of records under legal hold:

```typescript
interface LegalHold {
  id: string;
  caseId: string;
  recordIds: string[];  // Or query filter
  reason: string;
  placedBy: User;
  placedAt: Date;
  liftedAt?: Date;
  liftedBy?: User;
}

interface LegalHoldService {
  // Place hold
  placeHold(
    caseId: string,
    recordSelector: RecordSelector,
    reason: string
  ): Promise<LegalHold>;

  // Lift hold
  liftHold(holdId: string, user: User): Promise<void>;

  // Check if record is held
  isHeld(recordId: string): Promise<boolean>;
}

// Before deletion, check holds
async function safePurge(recordIds: string[]): Promise<void> {
  for (const id of recordIds) {
    if (await legalHoldService.isHeld(id)) {
      throw new Error(`Cannot delete record ${id}: under legal hold`);
    }
  }
  // Proceed with purge
}
```

**(c) Verifiable Purge Manifests with Merkle Trees**

Generate cryptographic proof of deletion:

```typescript
interface PurgeManifest {
  id: string;
  purgeRequestId: string;
  purgedRecords: PurgedRecord[];
  merkleRoot: string;  // Root hash of Merkle tree
  manifestHash: string;
  signature: string;   // Signed by purge service
  timestamp: Date;
}

interface PurgedRecord {
  id: string;
  type: string;
  purgedAt: Date;
  hash: string;  // Hash of record before deletion
}

// Build Merkle tree from purged records
function buildPurgeManifest(records: PurgedRecord[]): PurgeManifest {
  // 1. Hash each record
  const leaves = records.map(r => sha256(JSON.stringify(r)));

  // 2. Build Merkle tree
  const tree = new MerkleTree(leaves, sha256);
  const root = tree.getRoot().toString('hex');

  // 3. Create manifest
  const manifest = {
    id: uuidv4(),
    purgedRecords: records,
    merkleRoot: root,
    timestamp: new Date()
  };

  // 4. Sign manifest
  manifest.manifestHash = sha256(JSON.stringify(manifest));
  manifest.signature = sign(manifest.manifestHash, purgeServicePrivateKey);

  return manifest;
}

// Verify record was purged
function verifyPurge(
  recordId: string,
  manifest: PurgeManifest,
  proof: string[]
): boolean {
  const leaf = sha256(recordId);
  const tree = new MerkleTree([], sha256);
  return tree.verify(proof, leaf, manifest.merkleRoot);
}
```

**(d) Retention Policy Engine**

Auto-delete based on retention rules:

```yaml
# retention-policies.yml
policies:
  - name: "Unclassified intelligence - 3 years"
    selector:
      classification: UNCLASSIFIED
      record_type: intelligence_report
    retention_period: 3_years
    action: auto_purge

  - name: "Audit logs - 7 years"
    selector:
      record_type: audit_log
    retention_period: 7_years
    action: archive_then_purge

  - name: "Classified - indefinite"
    selector:
      classification: [SECRET, TOP_SECRET]
    retention_period: indefinite
    action: manual_review
```

Scheduler runs daily:
```typescript
async function runRetentionSweep(): Promise<void> {
  const policies = await loadRetentionPolicies();

  for (const policy of policies) {
    const expiredRecords = await findExpiredRecords(policy);

    if (policy.action === 'auto_purge') {
      // Initiate dual-control delete
      await dualControl.requestDelete(
        expiredRecords.map(r => r.id),
        systemUser,
        `Auto-purge per policy: ${policy.name}`
      );
    } else if (policy.action === 'manual_review') {
      // Notify data steward
      await notifySteward(expiredRecords, policy);
    }
  }
}
```

**(e) Selective Disclosure Packaging**

Generate audience-filtered data bundles:

```typescript
interface DisclosurePackage {
  id: string;
  audience: Audience;
  recordIds: string[];
  filters: DisclosureFilter;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  downloadUrl: string;
  accessLog: AccessLog[];
}

interface Audience {
  organizationId: string;
  users?: string[];
  clearanceLevel: string;
  purpose: string;  // e.g., "Court testimony in Case XYZ"
}

interface DisclosureFilter {
  // Redact sensitive fields
  redact: string[];  // e.g., ["ssn", "dob"]

  // Downgrade classification
  maxClassification: string;

  // Remove provenance details
  stripProvenance: boolean;

  // Anonymize entities
  anonymize: {
    entityTypes: string[];
    strategy: 'hash' | 'pseudonym' | 'remove';
  };
}

// Create disclosure package
const package = await disclosureService.createPackage({
  recordIds: ['e-1', 'e-2', 'e-3'],
  audience: {
    organizationId: 'partner-agency-001',
    clearanceLevel: 'CONFIDENTIAL',
    purpose: 'Joint investigation XYZ'
  },
  filters: {
    redact: ['ssn', 'phone'],
    maxClassification: 'CONFIDENTIAL',
    stripProvenance: true,
    anonymize: {
      entityTypes: ['Person'],
      strategy: 'pseudonym'
    }
  },
  expiresAt: addDays(new Date(), 30)
});

// Package includes:
// - Filtered/redacted data bundle (JSON)
// - README with usage restrictions
// - Signature for verification
// - Access instructions
```

**(f) Auto-Revoke on Source Change**

Monitor source data for changes, revoke stale disclosures:

```typescript
interface DisclosureWatchdog {
  // Watch source records for changes
  watchRecords(packageId: string, recordIds: string[]): Promise<void>;

  // On change, revoke package
  onRecordChanged(recordId: string): Promise<void>;
}

// Implementation
class DisclosureWatchdogImpl implements DisclosureWatchdog {
  async watchRecords(packageId: string, recordIds: string[]): Promise<void> {
    // Subscribe to change events
    for (const recordId of recordIds) {
      await eventBus.subscribe(`record.updated.${recordId}`, async () => {
        await this.revokePackage(packageId, `Source record ${recordId} updated`);
      });
    }
  }

  async revokePackage(packageId: string, reason: string): Promise<void> {
    const pkg = await disclosureService.getPackage(packageId);
    pkg.revokedAt = new Date();
    pkg.revocationReason = reason;
    await disclosureService.updatePackage(pkg);

    // Notify recipients
    await notifyRevocation(pkg, reason);

    // Log to audit
    await auditService.log({
      action: 'disclosure_revoked',
      packageId,
      reason
    });
  }
}
```

**(g) Provenance Integration**

All lifecycle events logged to provenance ledger:

```typescript
// Delete request
await provLedger.recordActivity({
  type: 'deletion_requested',
  actor: requestor.id,
  entities: recordIds,
  justification,
  timestamp: new Date()
});

// Dual approval
await provLedger.recordActivity({
  type: 'deletion_approved',
  actor: approver.id,
  request: requestId,
  timestamp: new Date()
});

// Purge execution
await provLedger.recordActivity({
  type: 'records_purged',
  actor: 'purge_service',
  entities: recordIds,
  manifestId: manifest.id,
  merkleRoot: manifest.merkleRoot,
  timestamp: new Date()
});

// Disclosure created
await provLedger.recordActivity({
  type: 'disclosure_package_created',
  actor: creator.id,
  package: packageId,
  audience: audience.organizationId,
  records: recordIds,
  filters,
  timestamp: new Date()
});

// Disclosure revoked
await provLedger.recordActivity({
  type: 'disclosure_revoked',
  package: packageId,
  reason,
  timestamp: new Date()
});
```

### Technical Specifications

**Service Structure**:
```
services/retention-engine/
├── src/
│   ├── dual-control/
│   ├── legal-hold/
│   ├── purge/
│   │   └── MerkleTree.ts
│   ├── retention/
│   ├── disclosure/
│   └── watchdog/
├── tests/
│   ├── dual-control-scenarios/
│   ├── purge-verification/
│   └── disclosure-filters/
└── README.md
```

**Database Schema**:
```sql
CREATE TABLE delete_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_ids TEXT[] NOT NULL,
  requestor_id UUID NOT NULL,
  justification TEXT NOT NULL,
  approver_id UUID,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

CREATE TABLE legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL,
  record_selector JSONB NOT NULL,
  reason TEXT NOT NULL,
  placed_by UUID NOT NULL,
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  lifted_at TIMESTAMPTZ,
  lifted_by UUID
);

CREATE TABLE purge_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purge_request_id UUID NOT NULL,
  purged_records JSONB NOT NULL,
  merkle_root TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disclosure_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience JSONB NOT NULL,
  record_ids TEXT[] NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT
);
```

### Deliverables Checklist

- [x] Dual-control delete workflow
- [x] Legal hold service
- [x] Merkle tree purge manifest generator
- [x] Retention policy engine
- [x] Disclosure package builder
- [x] Audience filtering logic
- [x] Auto-revoke watchdog
- [x] CLI: create/revoke disclosure packages
- [x] Provenance integration
- [x] GraphQL API
- [x] React UI for delete requests
- [x] Purge verification test suite
- [x] Compliance playbook

### Acceptance Criteria

1. **Dual-Control Delete**
   - [ ] Request delete as user A
   - [ ] Attempt execute without approval → blocked
   - [ ] Approve as user B
   - [ ] Execute purge → succeeds
   - [ ] Verify manifest generated

2. **Legal Hold**
   - [ ] Place hold on record
   - [ ] Attempt delete → blocked
   - [ ] Lift hold
   - [ ] Retry delete → succeeds

3. **Purge Verification**
   - [ ] Purge 100 records
   - [ ] Generate Merkle proof
   - [ ] Verify proof for each record

4. **Disclosure Package**
   - [ ] Create package with filters
   - [ ] Download package
   - [ ] Verify SSN redacted
   - [ ] Verify classification downgraded

5. **Auto-Revoke**
   - [ ] Create disclosure package
   - [ ] Update source record
   - [ ] Verify package revoked
   - [ ] Check revocation notification sent

## Implementation Notes

### Merkle Tree Libraries

Use `merkletreejs`:
```typescript
import { MerkleTree } from 'merkletreejs';
import crypto from 'crypto';

const sha256 = (data: string) => crypto.createHash('sha256').update(data).digest();

const leaves = recordIds.map(id => sha256(id));
const tree = new MerkleTree(leaves, sha256);
const root = tree.getRoot().toString('hex');
const proof = tree.getProof(leaves[0]);
const verified = tree.verify(proof, leaves[0], root);
```

### Disclosure Bundle Format

```
disclosure-package-abc123.zip
├── README.md               # Usage restrictions, expiry
├── data/
│   ├── entities.json       # Filtered entities
│   ├── relationships.json  # Filtered relationships
│   └── metadata.json       # Package metadata
├── manifest.json           # File checksums
└── signature.txt           # Package signature
```

### Performance Considerations

- Index `record_ids` arrays for fast hold lookups
- Batch Merkle tree construction (1000 records at a time)
- Async watchdog (don't block disclosure creation)
- Cache retention policy evaluations

## References

- [Merkle Trees](https://en.wikipedia.org/wiki/Merkle_tree)
- [Dual Control (Wikipedia)](https://en.wikipedia.org/wiki/Dual_control)

## Related Prompts

- **GOV-001**: Policy Change Simulator (test retention policies)
- **MIG-001**: Migration Verifier (purge legacy data post-migration)
- **EDGE-001**: Offline Kit (sync purge manifests to offline clients)
