# Module Metadata

## Fields

```json
{
  "module_id": "mod_dns",
  "name": "DNS Resolver",
  "mode": "passive",
  "jurisdictions": ["US", "EU"],
  "tos_url": "https://...",
  "risk_score": 2,
  "rate_limits": { "per_minute": 60 },
  "effects": ["read"],
  "egress_bytes_max": 20000
}
```

## Usage

- Registry filters modules based on jurisdiction, risk score, and policy.
- Risk thresholds require elevated authorization.
