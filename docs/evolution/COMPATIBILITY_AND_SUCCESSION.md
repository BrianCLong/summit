# Compatibility & Succession Planning

## 1. Objective
To ensure that replacing Summit components (or the entire platform) does not break critical evidence chains, audit logs, or operational capabilities. Succession must be **safe**, **verifiable**, and **reversible**.

## 2. Compatibility Guarantees

### 2.1 API Continuity
- **Semantic Versioning**: All APIs follow SemVer. Breaking changes occur only in major versions.
- **N-1 Support**: The platform supports the immediate previous version of an API for at least one release cycle (or 90 days).
- **Client SDKs**: Official SDKs are generated to match supported API versions.

### 2.2 Data Integrity
- **Schema Evolution**: Database migrations must be additive (backward compatible) whenever possible.
- **Destructive Changes**: Must be accompanied by a data migration script and a rollback script.
- **Evidence Links**: Cryptographic links in the `ProvenanceLedger` must remain verifiable even if the underlying data storage changes. The `hash` and `signature` are immutable.

### 2.3 Audit Continuity
- **Ledger Export**: The `ProvenanceLedger` can be exported to a portable format (e.g., JSON-LD, Verifiable Credentials) to be ingested by a successor system.
- **Verification Keys**: Public keys required to verify historical logs must be preserved in the **Handoff Bundle**.

## 3. Migration Windows & Tooling

### 3.1 Migration Strategy
1. **Dual Run**: Run both old and new components in parallel.
2. **Shadow Traffic**: Route traffic to both, but return responses from the old. Compare results.
3. **Canary Release**: Gradually shift traffic to the new component.
4. **Cutover**: Switch 100% traffic.
5. **Decommission**: Turn off old component after stability period.

### 3.2 Required Tooling
For any major subsystem replacement, a `migration-assistant` tool must be provided:
- **Analyze**: Check for incompatibilities in current data/configuration.
- **Migrate**: Transform data to new format.
- **Verify**: Validate data integrity after migration.

## 4. Rollback Paths
Every migration plan must include a **Rollback Procedure**:
- **Trigger**: Automatic rollback if error rate > 1% or latency > p95 2000ms.
- **Mechanism**: Restore previous version of code/container. Restore DB snapshot (if schema changed destructively) or run down-migrations.
- **Data Loss**: Document potential data loss during rollback (e.g., writes during the failed window).

## 5. Successor Requirements
A valid successor system must:
1. Ingest the **Handoff Bundle**.
2. Verify all historical `ProvenanceLedger` entries.
3. Support existing `OIDC` identities or map them securely.
4. Maintain `Read` access to archived data for regulatory periods (e.g., 7 years).
