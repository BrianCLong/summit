# Evidence Bundle Standard

## Overview

Summit uses deterministic **Evidence Bundles** to ensure that every PR and release is auditable, verifiable, and carries its own provenance. This standard defines the required format for these bundles.

## Canonical Specification

An Evidence Bundle is a directory containing a set of deterministic artifacts that capture the state of a change.

### Required Artifacts

1.  **manifest.json**: A machine-readable summary of the bundle.
2.  **diff.patch**: A standard git diff of the changes against a base ref.
3.  **diffstat.txt**: A summary of changes (files changed, insertions, deletions).
4.  **tree.txt**: A list of file paths included in the change.

### Naming Conventions

- **Directory Name**: `evidence-bundle-<sha>-<timestamp>`
- **Storage**: Evidence bundles should be generated locally and their summary pasted into the PR description. For releases, the bundle is archived as a build artifact.

## Manifest Schema

The `manifest.json` must contain the following fields:

| Field           | Type     | Description                                                 |
| :-------------- | :------- | :---------------------------------------------------------- |
| `timestamp`     | `string` | ISO8601 timestamp of generation.                            |
| `commit_sha`    | `string` | The git SHA (HEAD) of the working tree.                     |
| `base_ref`      | `string` | The base reference or merge base used for the diff.         |
| `changed_files` | `array`  | Alphabetically sorted list of changed files.                |
| `diffstat`      | `object` | Summary counts: `insertions`, `deletions`, `files_changed`. |
| `prompt_hashes` | `array`  | List of referenced prompt hashes (optional).                |
| `risk_level`    | `string` | Manual field: `low`, `medium`, `high`, or `unknown`.        |
| `checks_run`    | `array`  | List of manual or automated checks performed.               |

## PR Integration

When opening a PR, run the generator and paste the contents of `manifest.json` into the provided section in the PR template.

### Examples

#### Docs-only PR

```json
{
  "timestamp": "2026-01-30T10:00:00Z",
  "commit_sha": "a1b2c3d4...",
  "base_ref": "origin/main",
  "changed_files": ["docs/ga/EVIDENCE_BUNDLES.md"],
  "diffstat": { "files_changed": 1, "insertions": 50, "deletions": 0 },
  "prompt_hashes": [],
  "risk_level": "low",
  "checks_run": ["markdown-lint"]
}
```

#### Behavior PR

```json
{
  "timestamp": "2026-01-30T10:00:00Z",
  "commit_sha": "e5f6g7h8...",
  "base_ref": "origin/main",
  "changed_files": ["src/logic.py", "tests/test_logic.py"],
  "diffstat": { "files_changed": 2, "insertions": 100, "deletions": 10 },
  "prompt_hashes": ["sha256:abc..."],
  "risk_level": "medium",
  "checks_run": ["pytest", "lint", "typecheck"]
}
```

## Usage

### Local Generation

```bash
python3 scripts/maintainers/gen-evidence-bundle.py --out my-bundle --base origin/main
```

### Makefile

```bash
make evidence-bundle
```
