# Analytics Read-Only Dashboard

A lightweight dashboard that visualizes adoption signals using read-only credentials. Intended for onboarding validation and privacy-respecting telemetry.

## Signals Displayed

- Time to first successful agent run
- Count of policy denials during onboarding
- Count of cost-cap hits in first 24 hours

## Run

```bash
ACCESS_TOKEN=${ACCESS_TOKEN:-$(jq -r '.access_token' onboarding-state.json)}
TENANT_ID=${TENANT_ID:-$(jq -r '.tenant_id' onboarding-state.json)}

curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$SUMMIT_API_BASE/analytics/adoption?tenant=$TENANT_ID" | jq
```

The endpoint is read-only and honors tenant-level provenance visibility rules. Refresh no faster than once per minute.
