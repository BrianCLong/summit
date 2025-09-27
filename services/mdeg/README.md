# Multicloud Data Egress Governor (MDEG)

MDEG is a Go sidecar that enforces multicloud object storage egress policies. The
service applies deterministic policy decisions, hard data volume and cost caps,
and per-policy rate limiting before any transfer is permitted. Approved transfers
emit signed manifests that can be reconciled against provider accounting data.

## Features

- **Policy Scoping** – Match requests by data class and destination (AWS, GCP, Azure).
- **Deterministic Enforcement** – Byte, cost, and rate ceilings block violations synchronously.
- **Signed Manifests** – Each approved transfer is recorded with an HMAC-SHA256 signature.
- **Provider Reconciliation** – Manifests can be reconciled against provider byte/cost reports.
- **SDKs** – Lightweight TypeScript and Python clients wrap the HTTP API.

## Running the Sidecar

```bash
cd services/mdeg
cp config.example.yaml config.yaml
MDEG_CONFIG=config.yaml go run ./cmd/mdeg
```

Configuration is supplied via YAML (see `config.example.yaml`). Key values:

- `providers`: Per-cloud egress pricing metadata.
- `policies`: Policy definitions containing allowed destinations, classes, and caps.
- `signingKey`: Secret used to sign manifests.

## HTTP API

| Method & Path | Description |
| --- | --- |
| `POST /transfers` | Request approval for a transfer. Returns signed manifest on success. |
| `GET /manifests/{id}` | Retrieve a previously issued manifest. |
| `POST /manifests/{id}/reconcile` | Submit provider totals (bytes, cost) to reconcile against the manifest. |
| `GET /policies` | Diagnostic snapshot of accounting windows and usage. |
| `GET /healthz` | Health probe. |

## Tests

Run the policy tests with:

```bash
cd services/mdeg
go test ./...
```

## Clients

- TypeScript client: `sdk/typescript/src/mdeg.ts`
- Python client: `sdk/python/maestro_sdk/mdeg/client.py`

Both provide simple wrappers for requesting transfers, retrieving manifests, and
posting reconciliation results.
