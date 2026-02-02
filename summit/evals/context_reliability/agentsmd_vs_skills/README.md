# Context Reliability Eval: AGENTS.md vs Skills

This eval harness measures the reliability and effectiveness of passive context (`AGENTS.md`) versus on-demand skills.

## Usage

```bash
python3 run.py [--mini]
```

## Metrics

- `pass_rate`: Percentage of successful task completions.
- `skill_invocation_rate`: Percentage of times a relevant skill was invoked.
- `token_overhead`: Additional tokens used by context injection.
