# GA Prompt #00 CI Evidence Mode Runbook

## Purpose

Provide a deterministic operator runbook for generating and validating the Prompt #00
Feature Discovery -> GA evidence bundle.

## Preconditions

- Run from repo root.
- `pnpm` dependencies installed.
- `prompts/ga/feature-discovery-ga-development@v1.md` exists.
- `prompts/registry.yaml` includes `ga-feature-discovery-prompt`.

## Generate Evidence Bundle

```bash
RUN_ID=$(date -u +%Y%m%d-%H%M)
make ga-prompt00-scaffold RUN_ID="$RUN_ID"
```

Expected output directory:

- `docs/evidence/ga-hardening/prompt-00/<RUN_ID>/`

Expected files:

- `manifest.json`
- `commands.txt`
- `prompt-integrity.txt`
- `boundaries.txt`
- `status-json.txt`

## Verify Evidence Bundle

```bash
make ga-prompt00-verify RUN_ID="$RUN_ID"
```

Equivalent direct call:

```bash
scripts/ga/verify-prompt-00-evidence-bundle.sh --run-id "$RUN_ID"
```

## Failure Handling

- If `prompt-integrity.txt` fails: reconcile `prompts/registry.yaml` hash with canonical prompt file.
- If `boundaries.txt` fails: run `node scripts/check-boundaries.cjs`, scope changes to a single zone.
- If `status-json.txt` fails: resolve JSON conflicts in `docs/roadmap/STATUS.json`.

## Evidence Retention

- Keep prompt-00 bundles under `docs/evidence/ga-hardening/prompt-00/`.
- Do not rewrite historical run directories; create a new `RUN_ID` for each rerun.

