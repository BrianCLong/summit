# @summit/compliance-evaluator

HTTP ingestion endpoint for compliance evidence events. Validates evidence schemas, evaluates OPA policies, and writes an append-only attestation ledger.

## Run locally

1. Start OPA with the policies mounted:

```bash
opa run --server --addr :8181 --set=decision_logs.console=true policies/rego
```

2. Run the evaluator:

```bash
pnpm -C services/compliance-evaluator dev
```

3. Post evidence:

```bash
curl -sS http://localhost:4319/v1/evidence \
  -H 'content-type: application/json' \
  -d '{"spec":"summit.evidence.authz.v1","control_id":"sec-AUTHZ-001","event_type":"authz.decision","occurred_at":"2025-12-26T00:00:00Z","decision":"allow","actor":{"id":"u1"},"resource":{"id":"r1"}}' | jq .
```

Ledger defaults to `data/attestations.ndjson`.
