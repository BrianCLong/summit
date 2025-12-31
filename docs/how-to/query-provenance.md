# How To: Query Provenance

Provenance queries verify that policy enforcement, lineage, and costs match expectations.

## Fetch by Reference

```bash
curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  "$SUMMIT_API_BASE/provenance/$PROVENANCE_REF" | jq
```

Key fields to validate:

- `lineage.inputs[]` — sources and hashes
- `policy_decisions[]` — policy IDs, versions, verdicts, and explanations
- `cost.actual_cents` and `cost.estimate_cents`

## List Recent Runs

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$SUMMIT_API_BASE/provenance?tenant=$TENANT_ID&limit=20" | jq '.items[] | {run_id, status, cost: .cost.actual_cents}'
```

Use the list API to spot outliers (high cost, repeated denials) during onboarding.

## Export for Audit

Export provenance to a signed bundle for compliance review:

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$SUMMIT_API_BASE/provenance/$PROVENANCE_REF/export?format=jsonsig" -o prov-bundle.json
```

Store export artifacts in your audit store; do not circulate raw production data via email or chat.
