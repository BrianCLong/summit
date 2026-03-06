# Runbook: Context Engineering Drift

## Triggers
- CI Job `context-drift` fails.
- `scripts/monitoring/context_drift.ts` returns exit code 1.

## Symptoms
- "Duplicate content found" in logs.
- "Guidance size exceeds baseline" warnings.

## Remediation

### Duplicate Content
1. Identify the files with identical content.
2. Refactor to a single shared file in `guidance/` or `instructions/`.
3. Update the `context_manifest.json`.

### Size Drift
1. Review recent additions to `.summit/context/guidance/`.
2. Move non-essential rules to `instructions/` (loaded on-demand).
3. Condense verbose prompts.
4. If growth is legitimate, update the `BASELINE` constant in `scripts/monitoring/context_drift.ts`.
