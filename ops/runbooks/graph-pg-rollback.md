# Graph-Postgres Drift Rollback Runbook

**Goal:** Restore consistency between authoritative Postgres tables and Neo4j graph projections.

## Trigger
- Drift ratio > threshold (e.g., >0.5% of scanned objects).
- Critical findings (MISSING_NODE on key entities) detected by `graph-sync-validator`.
- Alert: `GraphDriftHighSeverity`.

## Pre-requisites
- CLI access to `graph-sync-validator` (or via worker).
- Database credentials (read/write).
- Feature flag management access.

## Steps

### 1. Stop the Bleeding
Toggle the feature flag to switch graph writers to **read-only** mode or stop the projection consumers.

```bash
# Example: Using feature flag CLI or UI
summit-cli flags set graph_write_enabled false
```

### 2. Identify Drift
Run the validator in dry-run mode to get the latest drift report.

```bash
# Run validator
pnpm graph-sync-validator run \
  --selectors configs/selectors/*.yaml \
  --pg "$PG_URL" \
  --neo4j "$NEO4J_URL" \
  --out ./drift-report.json
```

Review `drift-report.json` for severity and volume.

### 3. Generate & Review Fix Plan
The report contains an `autofixPlan` with Cypher and SQL statements.
Extract the Cypher statements to a file:

```bash
jq -r '.autofixPlan.cypher[]' drift-report.json > fix.cypher
```

Review `fix.cypher` for safety (e.g., ensure no mass deletes unless expected).

### 4. Apply Fixes
If the plan looks safe, apply it.

**Option A: Automatic Apply (if configured)**
```bash
pnpm graph-sync-validator run \
  --selectors configs/selectors/*.yaml \
  --pg "$PG_URL" \
  --neo4j "$NEO4J_URL" \
  --apply
```

**Option B: Manual Apply**
Run the Cypher script against Neo4j using `cypher-shell` or Neo4j Browser.

```bash
cat fix.cypher | cypher-shell -u neo4j -p $NEO_PASS
```

### 5. Verify
Re-run the validator in dry-run mode. Ensure findings are zero or acceptable.

### 6. Resume Traffic
Re-enable graph writes.

```bash
summit-cli flags set graph_write_enabled true
```

### 7. Restore from Snapshot (Last Resort)
If drift is unrecoverable (e.g., data corruption):
1. Identify last known good snapshot of Neo4j.
2. Restore snapshot.
3. Re-play events from Postgres/Event Log since snapshot time (if valid).
4. Run validator to confirm sync.

## Escalation
If drift persists or cause is unknown (code bug), escalate to **Data Platform Team**.
