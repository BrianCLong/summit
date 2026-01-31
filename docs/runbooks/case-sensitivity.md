# Case-Sensitivity Path Collisions

> **Last Updated**: 2026-01-30
> **Owner**: Platform Team
> **Guardrail**: Summit Case-Sensitivity Marshal

This runbook explains how to detect and prevent case-sensitivity path collisions in the repository.

## Why This Matters

The Summit repository is developed and deployed across different operating systems:
- **Linux** (CI, Production): Case-sensitive filesystem. `File.txt` and `file.txt` are distinct.
- **macOS/Windows** (Local Dev): Case-insensitive filesystem. `File.txt` and `file.txt` refer to the same file.

If a developer on Linux adds a file that differs from an existing path only by case, macOS developers will experience silent corruption, build failures, or git state inconsistency.

## Detection

We use a deterministic detector that scans the git index for such collisions.

### Local Command

To check for collisions locally:

```bash
node scripts/maintainers/check-case-collisions.mjs
```

### Makefile Shortcut

```bash
make check-case-collisions
```

### Exit Codes
- `0`: No collisions found.
- `1`: One or more collisions detected (fix required).

## How to Fix

If the detector finds collisions, they must be resolved by choosing a canonical casing and renaming the colliding paths.

### Safe Rename Pattern (macOS/Windows)

On case-insensitive filesystems, a simple `mv file.txt File.txt` might not be detected by git or might fail. Always use `git mv`:

1. **Identify the collision group**:
   ```text
   ❌ Found 1 case-sensitivity collision groups:
   Group [docs/security/threat_model.md]:
     - docs/security/THREAT_MODEL.md
     - docs/security/threat_model.md
   ```

2. **Rename the non-canonical file** (e.g., if `THREAT_MODEL.md` is preferred):
   If you are on macOS/Windows, you may need a two-step move if the filesystem doesn't allow case-only renames:
   ```bash
   git mv docs/security/threat_model.md docs/security/threat_model.md.tmp
   git mv docs/security/threat_model.md.tmp docs/security/THREAT_MODEL.md
   ```

3. **Verify**:
   Run the detector again to ensure the collision is resolved.

4. **Commit**:
   ```bash
   git commit -m "chore: resolve case-sensitivity collision for THREAT_MODEL.md"
   ```

## Gotchas

- **Git Cache**: Sometimes git's index can get "confused" on macOS if you have performed manual renames. Running `git ls-files` will always show what git thinks is tracked.
- **Directory Collisions**: The detector also checks for directory-level collisions (e.g., `Apps/` vs `apps/`). These are often harder to fix and may require moving all files from one to the other.
