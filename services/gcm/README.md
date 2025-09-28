# Governed Chargeback & Metering (GCM)

GCM is a lightweight metering microservice that calculates chargeback amounts by
sensitivity policy tiers and workload units. It exposes REST APIs for ingesting
job usage, generating signed billing manifests, enforcing budget guardrails, and
reconciling the internal ledger against provider-reported usage. The service is
implemented in Go with in-memory storage for rapid prototyping.

## Features

- Policy-aware pricing for CPU hours, storage, and network egress units.
- Budget guardrails that block over-budget jobs with detailed explanations.
- Signed billing manifests that provide per-policy line items and audit trail
  hashes.
- Reconciliation endpoint that compares manifest totals to provider usage data
  with configurable error tolerances.
- TypeScript SDK for integrating applications and a simulator UI for manual
  testing.

## Running the service

```bash
cd services/gcm
GO_HTTP_ADDR=":8085" go run ./cmd/gcm-service
```

Environment variables:

- `GO_HTTP_ADDR` (default `:8080`): HTTP listen address.
- `GCM_POLICY_CONFIG` (optional): Path to a YAML file defining policy rate
  cards and budgets. If omitted, default sample policies are loaded.
- `GCM_SIGNING_SECRET` (optional): Shared secret for manifest signing. Defaults
  to a development secret.
- `GCM_RECON_TOLERANCE` (optional): Decimal percentage (e.g. `0.02`) accepted
  difference between internal manifests and provider usage totals.

## API Overview

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/v1/jobs` | Submit a job usage report. Returns chargeback details or a guardrail violation. |
| `GET` | `/api/v1/accounts/{accountId}/manifest` | Retrieve the current signed manifest for the account. |
| `POST` | `/api/v1/provider-usage` | Submit aggregated provider usage totals for reconciliation. |
| `GET` | `/api/v1/accounts/{accountId}/reconciliation` | Compare manifest totals to provider usage. |

See the SDK (`sdk/typescript`) and simulator UI (`ui/gcm-simulator`) for sample
client integrations.
