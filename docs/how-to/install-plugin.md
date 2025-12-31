# How To: Install a Plugin Safely

## Review Before Install

- Confirm the plugin manifest is signed and includes a policy bundle hash.
- Check declared scopes; reject plugins requesting `policy:write` or broad `data:*` without justification.

## Install via API

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/plugins/install" \
  -d '{
    "plugin_id": "analytics-read-only",
    "version": "1.0.0",
    "scopes": ["provenance:read"],
    "policy_bundle": "sha256:...",
    "cost_cap_cents": 200
  }' | jq
```

- Enforce read-only plugins by default; elevate only after review.
- Require `cost_cap_cents` and provenance capture for plugin-invoked actions.

## Post-Install Verification

- Run the plugin’s self-test endpoint or health check.
- Review provenance for the install action to ensure policy approvals.
- Add the plugin to the allowlist for tenants who explicitly request it.
