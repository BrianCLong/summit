# Runbook: Prompt Engineering

## Tools
- Lint: `summit prompt lint path/to/prompts`
- Eval: `summit prompt eval path/to/prompt.yaml --fixtures path/to/fixtures.jsonl`

## Triage
### Schema Validation Failure
- **Symptom**: CI fails with schema errors.
- **Fix**: Update `.prompt.yaml` to match `prompt_artifact.schema.json`.

### Lint Failure
- **Symptom**: "Example count exceeds budget" or "Missing output format".
- **Fix**: Reduce examples or add explicit `output_format`.

### Eval Regression
- **Symptom**: Compliance score drops.
- **Fix**: Check if prompt instructions are vague. Add "needle in haystack" placement optimization.
