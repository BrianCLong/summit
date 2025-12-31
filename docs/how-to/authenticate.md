# How To: Authenticate with Minimal Scopes

## Choose the Right Principal

- **Service account (preferred):** Non-human automation; scoped per tenant.
- **User session:** Interactive debugging; avoid long-lived tokens.

## Request a Token

```bash
curl -s \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/auth/token" \
  -d '{
    "service_account": "demo-tenant/sa-quickstart",
    "scopes": ["agent:invoke", "provenance:read", "billing:read"],
    "ttl_seconds": 3600
  }' | jq
```

Keep scopes narrow. Add `data:read` only when ingestion is required. Do not grant `policy:write` during onboarding.

## Verify the Token

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$SUMMIT_API_BASE/auth/introspect" | jq
```

Confirm tenant binding, scopes, and expiration. Rotate tokens at or before 50% of their TTL.
