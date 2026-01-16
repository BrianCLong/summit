# Disaster Recovery (DR) Drill Procedure

## 1. Objective
To verify that the Summit platform can be restored from off-site backups within the Recovery Time Objective (RTO) of **4 hours**.

## 2. Frequency
*   **Mandatory**: Once per quarter.
*   **Triggered**: Before major upgrades or schema changes.

## 3. Procedure

### Step 1: Isolation
Create a new, isolated namespace or environment (e.g., `dr-drill-YYYYMMDD`). **DO NOT** perform drills in Production.

### Step 2: Restore
Follow the restore steps in [BACKUP_RESTORE.md](BACKUP_RESTORE.md) to populate the databases in the isolated environment using the latest Production backups.

### Step 3: Verification
Run the **Post-Restore Health Check**:
1.  **API Check**: Ensure API returns 200 OK.
2.  **Data Integrity**:
    *   Row count comparison (Source vs. Restored).
    *   Check for recent critical entities.
3.  **Graph Consistency**: Run `CALL db.schema.visualization()` in Neo4j.

### Step 4: Evidence Collection
Generate a signed evidence artifact:
```json
{
  "drill_id": "DR-2025-10-01",
  "executor": "jules",
  "timestamp": "2025-10-01T10:00:00Z",
  "rto_achieved": "45m",
  "status": "PASS",
  "evidence_path": "s3://intelgraph-evidence/dr/..."
}
```

### Step 5: Cleanup
Destroy the isolated environment to save costs.
