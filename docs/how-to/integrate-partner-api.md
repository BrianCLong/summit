# How To: Integrate via Partner API

## Principles

- Treat partner integrations as least-privilege clients.
- Enforce provenance capture and budget caps per partner.
- Require explicit allowlists for outbound callbacks.

## Establish a Partner Identity

```bash
curl -s -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/partners" \
  -d '{"name":"acme-analytics","allowed_origins":["https://acme.example"]}' | jq
```

Capture the `partner_id` for subsequent calls.

## Issue Partner Credentials

```bash
curl -s -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/partners/token" \
  -d '{
    "partner_id":"acme-analytics",
    "scopes":["agent:invoke","provenance:read"],
    "budget_cents":300,
    "rate_limit_rps":2
  }' | jq
```

## Test the Integration

Invoke a lightweight health-check agent and confirm provenance is attributed to the partner ID.

```bash
curl -s \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -H "X-Summit-Partner: acme-analytics" \
  "$SUMMIT_API_BASE/agents/run" \
  -d '{"agent_id":"hello-world","input":{"prompt":"partner smoke"}}'
```

Ensure callbacks or webhooks are restricted to the `allowed_origins` configured above.
