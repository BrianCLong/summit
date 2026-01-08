# 0020 - Backup/Restore Design & Risks

## Status

Accepted

## Context

To meet tiered RPO/RTO targets, we require consistent backups across Postgres, Neo4j, and object stores with automated restore drills. Existing ad-hoc scripts lack encryption and validation.

## Decision

- Use encrypted S3 buckets with KMS for all backups; enable object lock for 7-day immutability.
- Postgres: base backups + WAL shipping; Neo4j: filesystem snapshots; object stores: versioned buckets.
- Weekly automated restore drill in staging with validation checklist covering auth, search, ingest, and privacy budgets.
- Track RPO/RTO per tier: Tier0 (5m/30m), Tier1 (15m/60m), Tier2 (1h/4h).

## Alternatives Considered

1. **Single weekly full backup**: simpler but breaches RPO; rejected.
2. **Unencrypted backups**: operationally risky and non-compliant; rejected.
3. **Manual restores**: slow, error-prone; rejected.

## Consequences

- - Predictable recovery with validated drills; + compliance-ready encryption.
- - Storage cost for frequent backups; - operational complexity for multi-store restoration.

## Validation

- Restore drill logs stored with duration metrics; success requires meeting tier RTO and passing validation checklist.

## References

- `docs/wave13/disaster-recovery-runbook.md`
- `docs/wave13/mission-25-32.md`
