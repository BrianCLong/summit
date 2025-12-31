# Minimal Plugin (Read-Only Analytics)

Provides a partner-facing analytics view that summarizes provenance data. This example is read-only and enforces outbound allowlists.

## Install (Platform Admin)

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/plugins/install" \
  -d '{
    "plugin_id":"analytics-read-only",
    "version":"1.0.0",
    "scopes":["provenance:read"],
    "allowed_origins":["https://partner.example"],
    "cost_cap_cents":200
  }' | jq
```

## Run the Plugin Endpoint

```bash
curl -s -H "Authorization: Bearer $PARTNER_TOKEN" \
  -H "X-Summit-Partner: partner-demo" \
  "$SUMMIT_API_BASE/plugins/analytics-read-only/summary?tenant=$TENANT_ID" | jq
```

The plugin returns denials, time-to-first-success, and cost-cap-hit counts for the tenant, without exposing raw data.
