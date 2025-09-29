# Securiteyes IG OPA Bundle

This bundle contains the policy modules consumed by the Securiteyes IG risk gate and access checks.

- `abac.rego` &mdash; attribute-based access control for merge/deploy operations.
- `gates.rego` &mdash; CI gate logic for SBOM cleanliness, secret scans, provenance, coverage, e2e status, and Polygraph advisories.
- `modes.rego` &mdash; exposes Angleton vs. Dzerzhinsky thresholds for downstream policies.
- `export.rego` &mdash; stable evaluation surface for CI tooling (`data.securiteyes.export.result`).
- `tests/` &mdash; regression coverage; run with `opa test contracts/policy/securiteyes -v`.

Policy input contract:
```json
{
  "pr": {
    "sbom": {"clean": true},
    "secrets": {"leaks": 0},
    "provenance": {"verified": true},
    "tests": {"unit": 97, "critical_e2e_pass": true},
    "labels": [],
    "polygraph": {"score": 20, "confidence": "low"}
  },
  "_securiteyes": {
    "mode": "angleton",
    "thresholds": {"unit_coverage_min": 92, "allow_secrets_leaks": 0, "require_provenance": true},
    "enforcement": {"advisory_only": true, "block_merge_when_gate_fails": false}
  }
}
```
