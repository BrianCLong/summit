## Agent Task Metadata (required)

<!-- AGENT-METADATA:START -->

```json
{
  "agent_id": "",
  "task_id": "",
  "prompt_hash": "",
  "domains": [],
  "verification_tiers": [],
  "debt_delta": 0,
  "declared_scope": {
    "paths": []
  },
  "allowed_operations": []
}
```

<!-- AGENT-METADATA:END -->

## Intent & Scope

- Prompt reference (id@version):
- Declared scope (paths/domains):
- Allowed operations: create | edit | delete
- Expected debt delta (+ adds debt, - retires):

## Verification Plan

- Verification tier(s): A | B | C
- Tests and evidence to produce:
- Policy gates to satisfy (OPA, debt, provenance):

## Execution Artifacts

- Agent task spec path (JSON/YAML):
- Prompt registry entry: `prompts/registry.yaml`
- Target run artifact path: `artifacts/agent-runs/{task_id}.json`
- Metrics artifact: `agent-metrics.json` (CI-produced)

## Risk, Rollback, and Observability

- Rollback/abort conditions:
- New metrics/logs/traces:
- Security/compliance considerations:

## Completion Checklist

- [ ] Metadata block above is complete and valid JSON
- [ ] `scripts/ci/validate-pr-metadata.ts` run locally (or in CI)
- [ ] `scripts/ci/verify-prompt-integrity.ts` run against current diff
- [ ] Tests executed and linked in evidence
- [ ] Documentation updated (if applicable)
- [ ] Debt plan honored (budget respected or retired)

## Compliance Artifacts
- [ ] Remediation plan verified (if applicable)
- [ ] Evidence attached for governance gates
