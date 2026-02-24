# Evidence Bundle Standard

## Overview
An Evidence Bundle is a deterministic, git-derived artifact that provides proof of change, risk assessment, and verification for a Pull Request or Release. It ensures that every change to the Summit platform is auditable and transparent.

## Bundle Structure
A standard evidence bundle is a directory containing the following files:

| File | Description |
| --- | --- |
| `manifest.json` | The core metadata of the bundle in JSON format. |
| `diff.patch` | The full `git diff` against the chosen base reference. |
| `diffstat.txt` | The summary of changes (`git diff --stat`). |
| `tree.txt` | A deterministic list of all files in the repository at the time of generation. |

## Manifest Schema
The `manifest.json` file must contain the following fields:

- `timestamp`: (ISO8601 string) The UTC time when the bundle was generated. Optional in deterministic modes.
- `commit_sha`: (string) The full 40-character SHA-1 hash of the current HEAD.
- `base_ref`: (string) The base reference (e.g., `origin/main`) or merge-base used for comparison.
- `changed_files`: (array of strings) A sorted list of file paths modified in this change.
- `diffstat_summary`: (string) A one-line summary of insertions and deletions.
- `prompt_hashes`: (array of strings) SHA-256 hashes of any AI prompts used during development (from `prompts/registry.yaml`).
- `risk_level`: (string) Manual assessment of risk: `low`, `medium`, `high`, or `unknown`.
- `checks_run`: (array of strings) A list of manual or automated checks performed (e.g., `make test`, `pnpm lint`).

## Usage
### Generation
Use the standard generator script:
```bash
python3 scripts/maintainers/gen-evidence-bundle.py --base origin/main --risk low
```
Or via Makefile:
```bash
make evidence-bundle RISK=low
```

### Attachment to PR
When opening a PR, copy the contents of `manifest.json` into the PR description within an `AGENT-METADATA` block if applicable, or as a "Evidence Summary" section.

### Minimal vs Full Bundles
- **Docs-only PRs**: Can omit `checks_run` or mark as `N/A`.
- **Behavior/Logic PRs**: Must include `checks_run` and an accurate `risk_level`.

## Storage
Bundles are typically stored in the `evidence/bundles/` directory, named by the short SHA of the commit they represent (e.g., `evidence/bundles/a1b2c3d/`).

---
*Standard v1.0.0 — Jan 30, 2026*
