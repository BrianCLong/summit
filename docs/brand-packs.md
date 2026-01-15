# Brand Packs: Contract & Receipts

This document defines the runtime brand pack contract used by Switchboard theming and the provenance receipt emitted when a pack is applied.

## Brand Pack Contract (v1)

**Location (server packs):** `server/src/services/brand-packs/packs/*.json`  
**Endpoint:** `GET /api/brand-packs/tenants/:tenantId`

```json
{
  "id": "summit-default",
  "name": "Summit",
  "websiteUrl": "https://summit.example.com",
  "logos": {
    "primary": "https://cdn.summit.example.com/brand/summit-primary.svg",
    "mark": "https://cdn.summit.example.com/brand/summit-mark.svg",
    "inverted": "https://cdn.summit.example.com/brand/summit-inverted.svg"
  },
  "navLabels": {
    "home": "Home",
    "investigations": "Investigations",
    "cases": "Cases",
    "dashboards": "Dashboards",
    "settings": "Settings",
    "support": "Support"
  },
  "tokens": {
    "palette": {
      "mode": "dark",
      "primary": "#0f766e",
      "secondary": "#1d4ed8",
      "accent": "#f59e0b",
      "background": "#0b1120",
      "surface": "#111827",
      "text": {
        "primary": "#f9fafb",
        "secondary": "#cbd5f5"
      }
    },
    "typography": {
      "fontFamily": "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      "baseSize": 16
    },
    "radii": {
      "sm": 4,
      "md": 8,
      "lg": 16,
      "pill": 9999
    },
    "spacing": {
      "sm": 12,
      "md": 16,
      "lg": 24
    },
    "shadows": {
      "sm": "0 1px 2px rgba(0, 0, 0, 0.08)",
      "md": "0 6px 16px rgba(0, 0, 0, 0.12)"
    }
  },
  "updatedAt": "2026-01-05T02:02:27Z"
}
```

## Brand Pack Application

**Endpoint:** `POST /api/brand-packs/tenants/:tenantId/apply`

```json
{
  "packId": "summit-default",
  "partnerId": "partner-x",
  "reason": "Switchboard rollout"
}
```

### Response (excerpt)

```json
{
  "receipt": {
    "id": "ledger-entry-id",
    "timestamp": "2026-01-05T02:02:27.000Z",
    "action": "brand-pack.apply",
    "actor": "user-123",
    "resource": "brand-pack:summit-default",
    "inputHash": "sha256...",
    "signature": "base64-signature",
    "signerKeyId": "system-key..."
  },
  "receiptQueryPath": "/api/receipts/ledger-entry-id"
}
```

## Receipt Format

Receipts follow the `ReceiptService` contract and are retrievable via:

```
GET /api/receipts/:id
```

Each receipt is backed by the provenance ledger entry with metadata that includes `tenantId`, `packId`, and `appliedAt` to enable Switchboard verification workflows.
