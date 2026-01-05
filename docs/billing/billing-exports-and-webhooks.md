# Billing Exports & Webhook Integration

## Purpose

Billing exports provide deterministic 30-day usage totals for external billing systems. Each export
creates (or reuses) a snapshot identifier so downstream systems can reconcile the exact totals that
were exported.

## Schema Additions

### `billing_export_snapshots`

Stores aligned 30-day export snapshots.

| Column         | Type        | Notes                                                   |
| -------------- | ----------- | ------------------------------------------------------- |
| `id`           | UUID        | Snapshot identifier referenced by exports and webhooks. |
| `tenant_id`    | TEXT        | Tenant that owns the export.                            |
| `period_start` | TIMESTAMPTZ | Inclusive start of the 30-day window.                   |
| `period_end`   | TIMESTAMPTZ | Inclusive end of the 30-day window.                     |
| `created_at`   | TIMESTAMPTZ | Snapshot creation time.                                 |

### `billing_export_snapshot_items`

Stores the deterministic totals captured for a snapshot.

| Column           | Type         | Notes                                |
| ---------------- | ------------ | ------------------------------------ |
| `snapshot_id`    | UUID         | FK to `billing_export_snapshots.id`. |
| `kind`           | VARCHAR(100) | Usage event kind.                    |
| `unit`           | VARCHAR(50)  | Usage unit.                          |
| `total_quantity` | NUMERIC      | Total usage for the 30-day window.   |

### `billing_webhook_outbox`

Durable webhook outbox for billing integrations with retry policy.

| Column            | Type         | Notes                                                    |
| ----------------- | ------------ | -------------------------------------------------------- |
| `id`              | UUID         | Event identifier for retry tracking.                     |
| `tenant_id`       | TEXT         | Tenant that owns the event.                              |
| `event_type`      | VARCHAR(100) | Event name (e.g. `billing.export.ready`).                |
| `payload`         | JSONB        | Payload delivered to the webhook.                        |
| `webhook_url`     | TEXT         | Destination URL.                                         |
| `status`          | VARCHAR(50)  | `pending`, `retry`, `delivering`, `delivered`, `failed`. |
| `attempt_count`   | INTEGER      | Delivery attempts.                                       |
| `next_attempt_at` | TIMESTAMPTZ  | Next retry timestamp.                                    |
| `last_error`      | TEXT         | Last delivery error (if any).                            |
| `delivered_at`    | TIMESTAMPTZ  | Timestamp of successful delivery.                        |

## Export Formats

### JSON

```json
{
  "snapshotId": "b3d4...",
  "tenantId": "tenant-123",
  "periodStart": "2026-01-01T00:00:00.000Z",
  "periodEnd": "2026-01-31T00:00:00.000Z",
  "createdAt": "2026-01-31T00:00:00.000Z",
  "items": [{ "kind": "read_query", "unit": "query", "totalQuantity": 1200 }]
}
```

### CSV

```
snapshot_id,tenant_id,period_start,period_end,kind,unit,total_quantity
b3d4...,tenant-123,2026-01-01T00:00:00.000Z,2026-01-31T00:00:00.000Z,read_query,query,1200
```

## Webhook Payload

Billing exports can emit `billing.export.ready` events. Payloads are deterministic and include the
snapshot identifier for reconciliation.

```json
{
  "eventId": "1b2c...",
  "eventType": "billing.export.ready",
  "tenantId": "tenant-123",
  "deliveredAt": "2026-01-31T00:00:00.000Z",
  "payload": {
    "snapshotId": "b3d4...",
    "tenantId": "tenant-123",
    "periodStart": "2026-01-01T00:00:00.000Z",
    "periodEnd": "2026-01-31T00:00:00.000Z",
    "totals": [{ "kind": "read_query", "unit": "query", "totalQuantity": 1200 }]
  }
}
```

### Retry Policy

- Maximum attempts: 5
- Backoff: exponential, 1s base, capped at 30s
- Status transitions: `pending` → `delivering` → `delivered` or `retry`/`failed`

## Reference

- Billing export service: `server/src/services/billing/MeteringExportService.ts`
- Webhook outbox: `server/src/services/billing/BillingWebhookService.ts`
- Migration: `server/migrations/010_billing_exports_and_webhooks.sql`
