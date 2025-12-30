# Palantir — Policy-Qualified Local Analytics with Proof-of-Compliance (PQLA)

PQLA executes analytics inside policy-qualified sandboxes, returning only proof-carrying aggregates that satisfy disclosure constraints, ideal for federated environments.

## Objectives

- Enforce compute-to-data by running analytics co-located with protected datasets.
- Guarantee outputs meet disclosure constraints before leaving the sandbox.
- Produce compliance artifacts that bind query, policy decision, and sanitized output.

## Workflow Overview

1. **Request Intake:** Receive analytics request (joins, aggregations, graph metrics) with subject context and purpose.
2. **Policy Check:** Evaluate authorization and disclosure constraints; reject exports lacking proper token.
3. **Sandbox Execution:** Execute within resource-limited environment (CPU/memory/time) optionally attested.
4. **Disclosure Transformation:** Apply aggregation, redaction, k-anonymity, suppression, or differential privacy noise.
5. **Compliance Artifact:** Commit to request, policy decision ID, transformed output, and determinism token; hash-chain into ledger.
6. **Output Delivery:** Return transformed output and compliance artifact; optional attestation quote included.

## Governance Hooks

- Policy effects capture allow/deny/export requirements per request.
- Disclosure constraints captured with info-loss metrics for transparency.
- Attestation optional but recommended for regulated tenants and TEEs.
