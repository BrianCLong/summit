# Data Governance Authority

This module implements the core engines for data governance, compliance, and integrity.

## Components

### 1. Lineage Graph Builder (`DataLineageSystem.ts`)
Builds and queries operational and semantic lineage graphs.
- **Operational Lineage**: Tracks job executions and data flow (Job A -> Table B).
- **Semantic Lineage**: Tracks logical dependencies (Column X derived from Column Y).
- **Storage**: Uses `lineage_nodes` and `lineage_edges` tables.

### 2. Retention Policy Engine (`RetentionPolicyEngine.ts`)
Enforces data lifecycle policies.
- **Strategies**: Pluggable strategies (currently `TimeBasedRetentionStrategy`).
- **Actions**: DELETE, ARCHIVE (stubbed).
- **Storage**: Policies stored in `retention_policies`.

### 3. Schema Drift Detector (`SchemaDriftDetector.ts`)
Detects unauthorized or unintended changes in data schemas.
- Captures snapshots of schemas over time in `schema_snapshots`.
- Compares new schema against the last known snapshot.
- Reports added, removed, or changed fields.

### 4. Audit Record Compactor (`AuditCompactor.ts`)
Manages long-term storage and integrity of audit logs.
- Simulates compaction of high-volume logs into Merkle Tree roots.
- logs compaction events to `governance_tasks_log`.

## Usage

```typescript
import { GovernanceAuthority } from './GovernanceAuthority';

const governance = GovernanceAuthority.getInstance();

// Record lineage
await governance.lineage.upsertNode('users_table', 'DATASET', { db: 'postgres' });
await governance.lineage.upsertNode('daily_etl', 'JOB');
await governance.lineage.addEdge('daily_etl_id', 'users_table_id', 'WRITES');

// Check for schema drift
const drift = await governance.drift.checkDrift('users_table_id', currentSchemaObj);
if (drift) console.warn('Schema drift detected!', drift);

// Run maintenance
await governance.runDailyGovernanceTasks();
```
