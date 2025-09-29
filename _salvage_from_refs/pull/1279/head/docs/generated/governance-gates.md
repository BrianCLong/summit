OPA Governance Gates — Input Contract

This documents the input fields expected by tools/ci/governance-policy.rego for GA-readiness gates. Provide this JSON to OPA when evaluating the policy in CI.

Example Input (snippet)
{
  "gates": {
    "slo_burn": {
      "enabled": true,
      "thresholds": { "p95": {"1h": 0.02, "6h": 0.05}, "p99": {"1h": 0.01, "6h": 0.03} },
      "burn_rates": { "p95": {"1h": 0.015, "6h": 0.02}, "p99": {"1h": 0.005, "6h": 0.01} }
    },
    "sbom_diff": {
      "enabled": true,
      "new_high": 0,
      "new_critical": 0
    },
    "webauthn": {
      "enabled": true,
      "coverage_percent": 85,
      "min_percent": 80
    }
  },
  "services": [ /* existing service objects as already used by policy */ ],
  "workflows": [ /* existing workflow objects as already used by policy */ ]
}

Notes
- Set a gate’s enabled=false to bypass it temporarily for dry runs.
- SLO burn rates should be computed from your metrics backend and injected during CI.
- SBOM diff counts should come from your vulnerability diff job (e.g., tools/sbom/diff.ts).
- WebAuthn coverage is the percentage of sensitive endpoints with enforced step-up.

