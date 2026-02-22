# Federated Campaign Radar Operations Runbook

## Purpose

Operate and validate the Federated Campaign Radar (FCR) pipeline, ensuring privacy
budgets, provenance logging, and early-warning alerting remain within governance policy.

## Preconditions

- Tenant privacy budgets configured via `/api/fcr/budget`.
- Schema validation passes for all ingested signals.
- Provenance ledger operational.

## Standard Operations

### 1) Configure Privacy Budget

```bash
curl -X POST http://localhost:4000/api/fcr/budget \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":"tenant-a","epsilon":10,"delta":0.1}'
```

### 2) Run Pipeline

```bash
curl -X POST http://localhost:4000/api/fcr/run \
  -H 'Content-Type: application/json' \
  -d @fixtures/fcr-sample.json
```

### 3) Validate Provenance Entries

Check the provenance ledger for `fcr.ingest`, `fcr.cluster`, and `fcr.alert` action types.

## Incident Response

- If privacy budgets are exhausted, halt ingest and request additional budget via policy.
- If alerts spike unexpectedly, trigger replay audit with prior clusters and signal history.
- If signer reputations degrade, adjust credential weight via policy-as-code.

## Evidence Capture

- Preserve provenance ledger entries associated with alerts.
- Export response pack outputs and attach to incident tickets.
- Record policy evaluations for privacy and alerting thresholds.
