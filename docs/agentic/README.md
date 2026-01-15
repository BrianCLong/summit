# Agentic SDLC Operations

## Local (Human-in-the-Loop)

1. Run your agent task.
2. Emit an evidence bundle.
3. Verify determinism before sharing output.

Example:

```bash
node scripts/agentic/evidence_bundle.mjs \
  --task local-triage \
  --mode plan \
  --input docs/agentic/sample-input.json \
  --command "pnpm test:quick"

pnpm ci:agentic-evidence
```

`report.json` is deterministic; timestamps and run IDs are isolated to `stamp.json` only.

## CI (Controlled Autonomy)

The `agentic-ci.yml` workflow runs in plan-only mode on PRs and in apply mode via
`workflow_dispatch`. Apply mode is intentionally constrained to explicit human initiation.

## Evidence Review Checklist

- Confirm `report.json` has no timestamps or machine-specific paths.
- Confirm `report.md` matches `report.json`.
- Confirm `provenance.json` captures tool versions and command list.
- Confirm any diffs are captured in `diffs.patch` if applicable.

## Required Inputs

- **Prompt registry**: Ensure skill prompts are registered in `prompts/registry.yaml`.
- **PR metadata**: Include the `AGENT-METADATA` JSON block in every PR body.

## Governed Exceptions

Legacy workflows that cannot emit evidence must be documented as Governed Exceptions in
release or compliance notes, with a plan to deprecate the bypass.
