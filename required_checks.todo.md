# Required Checks Discovery

## Goals
1. Identify exact GitHub Check names for Branch Protection Rules.
2. Map temporary `check:*` names to actual CI jobs.

## Discovery Steps
1. Go to GitHub Repo Settings -> Branches -> Branch protection rules.
2. Look for "Require status checks to pass before merging".
3. List all required checks here.

## Proposed Gates (Temporary Names)
* `check:evidence-schemas-validate`: Validate all JSON artifacts against schemas.
* `check:dataset-validate`: Validate datasets against `dataset.schema.json`.
* `check:prompt-regression`: Ensure prompts haven't drifted negatively.
* `check:guardrails`: Ensure refusal fixtures trigger refusals.
* `check:cost-budget`: Ensure estimated cost is within limits.
* `check:no-pii-logs`: Scan logs for PII patterns.

## Rename Plan
Once actual job names are known, update `.github/workflows/summit-eval.yml` to match or use `name:` fields that align.
