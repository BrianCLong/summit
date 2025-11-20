# Audit & Compliance System

This module provides a comprehensive, high-integrity auditing and compliance framework for the platform.

## Core Components

### AdvancedAuditSystem (`server/src/audit/advanced-audit-system.ts`)
The central singleton service responsible for:
- Recording immutable audit events.
- Cryptographically signing and hashing events to ensure integrity.
- Enforcing data retention policies (purging old logs).
- Exporting logs in JSON or CSV formats.
- Generating compliance reports.

### Log Compactor (`server/src/audit/log-compactor.ts`)
Handles the archival of audit logs.
- Compresses a range of logs into a **Merkle Tree**.
- Stores the raw logs and metadata in **WORM** (Write Once Read Many) storage.
- Saves the Merkle Root to the database for lightweight verification.
- Allows the raw database rows to be pruned while maintaining cryptographic proof of existence.

### WORM Storage (`server/src/audit/worm.ts`)
Abstracts the storage layer for archived logs.
- **Production:** Uses AWS S3 Object Lock (Compliance Mode).
- **Development/Test:** Uses a local filesystem fallback that sets file permissions to read-only.

### Compliance Manager (`server/src/compliance/compliance-manager.ts`)
High-level orchestration for regulatory needs.
- **Check Status:** Evaluates current system status against frameworks like GDPR, SOC2, HIPAA.
- **Evidence Generation:** Bundles audit logs and reports into signed packages for external auditors.
- **Violation Resolution:** Manages the lifecycle of compliance alerts (resolution is recorded as a new immutable event).

### Data Lineage (`server/src/compliance/data-lineage.ts`)
Tracks the flow of data through the system.
- Uses a graph-based model (Nodes and Edges) stored in PostgreSQL.
- Supports recursive upstream/downstream traversal.

## Database Schema
The system uses dedicated tables in PostgreSQL:
- `audit_events`: The main append-only log. Protected by a trigger to prevent updates.
- `compliance_reports`: Stores generated report summaries.
- `audit_merkle_roots`: Stores roots of compacted log ranges.
- `lineage_nodes` / `lineage_edges`: Stores data flow graphs.

## Usage

### Recording an Event
```typescript
import { AdvancedAuditSystem } from './audit/advanced-audit-system';

await AdvancedAuditSystem.getInstance().recordEvent({
  eventType: 'user_login',
  action: 'login',
  outcome: 'success',
  userId: 'user-123',
  tenantId: 'tenant-abc',
  // ... other fields
});
```

### Compacting Logs
```typescript
import { LogCompactor } from './audit/log-compactor';

const compactor = new LogCompactor(dbPool, auditSystem, logger);
// Archives logs older than 30 days
const rootHash = await compactor.compactLogs(thirtyDaysAgo, 'my-audit-bucket');
```

### Checking Compliance
```typescript
import { ComplianceManager } from './compliance/compliance-manager';

const manager = new ComplianceManager(auditSystem, dbPool, redis, logger);
const status = await manager.checkComplianceStatus('GDPR');
```
