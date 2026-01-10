# Scan Capsule

## Structure

```json
{
  "capsule_id": "cap_...",
  "targets_commitment": "sha256(salted_targets)",
  "ledger": {
    "modules": [
      {
        "module_id": "mod_dns",
        "policy_decision_id": "pdt_...",
        "witness_chain_id": "wtn_...",
        "redacted_results": "base64..."
      }
    ]
  },
  "determinism_token": "det_...",
  "signature": "sig_..."
}
```

## Guarantees

- Signed capsule validates module execution and policy decisions.
- Targets are committed using tenant-specific salted hashes.
