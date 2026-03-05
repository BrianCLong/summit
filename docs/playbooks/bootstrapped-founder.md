# Bootstrapped Founder Playbook (BFP)

## Purpose

The bootstrapped founder workflow converts one idea brief into deterministic, machine-verifiable artifacts.

## Inputs

- Idea brief markdown file.

## Outputs

- `artifacts/bootstrapped-founder/report.json`
- `artifacts/bootstrapped-founder/metrics.json`
- `artifacts/bootstrapped-founder/stamp.json`

## Run

```bash
python -m pipelines.bootstrapped_founder.workflow path/to/idea.md
```

## Guardrails

- Evidence IDs must follow `BFP-[DOMAIN]-[NNN]`.
- Feature flag is `bootstrapped_founder` and remains disabled by default.
- Output files are deterministic for identical input content.
