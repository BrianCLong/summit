# Evidence Export Contents & Queryability

## Scope

This document defines the evidence export bundle emitted by the provenance export flow and how
operators can query the underlying sources. The export is built to satisfy the Summit Readiness
Assertion by maintaining deterministic evidence coverage across access, policy, and administrative
changes.

## Bundle Contents

Exports are delivered as a ZIP archive with the following files:

| File                         | Description                                                   | Source                                 |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `metadata.json`              | Export envelope with counts, time window, and actor context.  | Export API                             |
| `audit_events.json`          | Provenance/audit events for the requested window.             | `provenance_ledger_v2`                 |
| `access_logs.json`           | Immutable access logs with legal basis and reason-for-access. | `maestro.audit_access_logs`            |
| `admin_change_receipts.json` | Admin change receipts captured as provenance entries.         | `provenance_ledger_v2`                 |
| `policy_versions.json`       | Policy version history snapshot.                              | `policy_versions` + `managed_policies` |
| `dr_receipts.json`           | Disaster recovery receipts and related evidence artifacts.    | `evidence_artifacts`                   |
| `policy_bundle.json`         | Tenant policy bundle snapshot (when configured).              | Tenant settings                        |
| `receipt.json`               | Export receipt with hash and issuance details.                | Export API                             |

### Admin Change Receipts

Admin change receipts are derived from provenance entries with action types:

```
TENANT_CREATED
TENANT_SETTINGS_UPDATED
TENANT_DISABLED
ROLE_CREATED
ROLE_UPDATED
ROLE_DELETED
ROLE_ASSIGNED
ROLE_REVOKED
ROLES_LISTED
```

### DR Receipts

DR receipts are sourced from evidence artifacts whose `artifact_type` is `receipt`,
`dr_receipt`, or `disaster_recovery_receipt`.

## Queryability

All exportable evidence is queryable directly in Postgres. Example queries:

### Access Logs

```
SELECT *
FROM maestro.audit_access_logs
WHERE tenant_id = $1
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at DESC;
```

### Admin Change Receipts (Provenance Ledger)

```
SELECT id,
       tenant_id,
       action_type,
       resource_type,
       resource_id,
       actor_id,
       actor_type,
       timestamp,
       metadata,
       payload,
       current_hash
FROM provenance_ledger_v2
WHERE tenant_id = $1
  AND action_type = ANY($2)
  AND timestamp BETWEEN $3 AND $4
ORDER BY timestamp DESC;
```

### Policy Versions

```
SELECT
  pv.id,
  pv.policy_id,
  pv.version,
  pv.status,
  pv.created_by,
  pv.created_at,
  pv.approved_by,
  pv.approved_at,
  pv.content,
  mp.name as policy_name,
  mp.tenant_id
FROM policy_versions pv
JOIN managed_policies mp ON mp.id = pv.policy_id
WHERE mp.tenant_id = $1
  AND pv.created_at BETWEEN $2 AND $3
ORDER BY pv.created_at DESC;
```

### DR Receipts

```
SELECT
  id,
  artifact_type,
  storage_uri,
  sha256,
  classification_level,
  content_preview,
  created_at,
  tenant_id
FROM evidence_artifacts
WHERE tenant_id = $1
  AND artifact_type = ANY($2)
  AND created_at BETWEEN $3 AND $4
ORDER BY created_at DESC;
```

## Policy Decision Context

Export provenance entries record OPA decision IDs in `metadata.policyDecisionId`, alongside the
policy version and compliance mode used during evaluation.
