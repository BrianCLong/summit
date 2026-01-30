# Summit Overlay: iac-terraform

## Guardrails

- Enforce policy-as-code via policy/skills/skill_policy.rego before any execution.
- Record evidence bundles under evidence/skills/{timestamp}/ for every run.
- Require provenance fields in generated outputs and cite source URIs where applicable.
- Governed Exceptions are permitted only when documented in the registry with a rationale.

## Expected Output Schema (JSON)

```json
{
  "skill": "iac-terraform",
  "inputs": {},
  "tool_calls": [],
  "outputs": {},
  "diffs": {
    "files": [],
    "summary": ""
  },
  "checksums": {},
  "policy": {
    "allow": false,
    "denies": []
  },
  "timestamp": ""
}
```
