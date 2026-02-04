# Prompt: gitattributes-lfs-exception@v1

## Purpose
Define a governed workflow for adding or adjusting `.gitattributes` exceptions so binary assets
can be checked out without Git LFS smudge failures while preserving repository integrity.

## Scope
- `.gitattributes`
- `docs/roadmap/STATUS.json`
- `prompts/registry.yaml`
- `prompts/governance/gitattributes-lfs-exception@v1.md`

## Instructions
1. Identify the affected file patterns and verify why LFS pointer expectations are incorrect.
2. Add the minimal `.gitattributes` exception needed (avoid broad patterns).
3. Update `docs/roadmap/STATUS.json` with the change rationale and timestamp.
4. Compute SHA-256 of this prompt file and register it in `prompts/registry.yaml`.
5. Ensure the PR metadata references the new prompt ID and hash.

## Verification
- `git status` is clean after checkout with `GIT_LFS_SKIP_SMUDGE=1`.
- `.gitattributes` contains the new exception entry.
