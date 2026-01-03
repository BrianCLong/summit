## Summary

Security + governance P0/P1 hardening: remediated qs advisory via override, added PR dependency review gate, added readiness assertion + evidence index, and aligned security/compliance docs to actual CI gates. Summit Readiness Assertion now anchors readiness claims in `docs/SUMMIT_READINESS_ASSERTION.md`.

## M&A / Integration Readiness (DD Signal)

- **DD Signal**: N/A
- **Risk/Cost**: N/A
- **Control/Pattern**: N/A
- **Proof**: N/A
- **Reversibility**: N/A

## Canary Plan

- Metrics to watch: p95 latency, error rate, saturation
- Ramp: 5% → 20% → 50% → 100% (hold 20% for 30–60m)
- Rollback trigger(s): SLO burn > X, error rate > Y
- Rollback steps: `helm rollback <release> <rev>` + feature flag

## Test Evidence

- `pnpm audit --prod`
- `node scripts/check-boundaries.cjs`

## CI Confirmation

- Deferred pending CI run on PR branch.

## Non-Goals

- No test-determinism work, UI refactors, or broad architecture changes.
- No major dependency upgrades beyond targeted security remediation.

## Hard Guarantees

- PR dependency review gate blocks high/critical vulnerabilities and denied licenses.
- qs advisory (GHSA-6rw7-vpxm-498p) remediated via override.
- Security evidence index and control mapping reflect current CI gates.

## Migration Gate (if applicable)

- [ ] Schema/contract change
- Gate: apply behind flag; run forward/backward compat tests

## Observability

- [ ] New traces/metrics/logs added
- Dashboards/alerts link: N/A

## Security/Compliance

- [ ] Secrets via sealed-secrets
- [ ] SBOM attached; SAST/SCA clean
- [ ] Supply chain checks passed (signing, provenance, SBOM)
- Exception ID/reference (if applicable): N/A

## Verification

- [ ] Smoke checks
- [ ] Golden path e2e: ingest → resolve → runbook → report

## 🧠 Copilot Review Tasks

- [ ] `/explain-changes`
- [ ] `/generate-tests`
- [ ] `/risk-callouts`
- [ ] `/summarize-diff`

## ✅ Checklist

- [ ] Code compiles & passes CI
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] OPA policies verified
- [ ] Grafana dashboards updated if applicable
- [ ] **Hot Files**: I have avoided modifying shared hot files (root config, Makefiles) unless absolutely necessary.
- [ ] **Feature Flags**: New behavior is hidden behind a feature flag.

## Test Evidence

- [ ] Provide links or attachments for test results.

## CI Confirmation

- [ ] Confirm that the golden-path CI workflow has run and passed successfully.

## Non-Goals

- Describe what this change does not cover.

## Hard Guarantees

- List the guarantees this change provides (e.g., performance thresholds, invariants).

<!-- AGENT-METADATA:START -->

```
{
  "agent_id": "codex-cli",
  "task_id": "SECURITY_P0P1_GATES_20260103",
  "prompt_hash": "fa67143156ebca274fc40fb08463bdb4e4df7d41119d2d2024d21fc2168e95bf",
  "domains": ["security", "governance", "compliance", "ci", "supply-chain"],
  "verification_tiers": ["B"],
  "debt_delta": 0,
  "declared_scope": {
    "paths": [
      ".github/",
      "docs/",
      "agents/",
      "prompts/",
      "package.json",
      "pnpm-lock.yaml",
      "SECURITY.md"
    ],
    "domains": ["security", "governance", "compliance", "ci", "supply-chain"]
  },
  "allowed_operations": ["create", "edit"]
}
```

<!-- AGENT-METADATA:END -->
