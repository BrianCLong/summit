# Case-Sensitivity Path Collisions

## Symptoms

- Git reporting modified files immediately after a fresh clone.
- "File not found" errors in CI (Linux) that you can't reproduce locally (macOS/Windows).
- Inability to switch branches because of "untracked files would be overwritten".
- Local repository permanently "dirty" with no changes in `git diff`.

## Rationale

Linux file systems are typically case-sensitive (`File.txt` and `file.txt` are different), while macOS and Windows are case-insensitive by default (`File.txt` and `file.txt` refer to the same file).

If a repository contains two files (or two directories) that differ only by case, a developer on macOS/Windows will only see one of them on disk, while Git's index tracks both. This leads to silent corruption and local-vs-remote divergence.

## Detection

We use a deterministic check against the git index (the source of truth) rather than the local filesystem. This ensures developers on all platforms can detect the issue.

### Local Command

```bash
make check-case-collisions
```

Or directly:

```bash
node scripts/maintainers/check-case-collisions.mjs
```

## Remediation (How to Fix)

If collisions are found, you must choose one canonical casing and move/merge the other files.

**⚠️ Warning:** Renaming `File.txt` to `file.txt` on macOS/Windows requires a two-step process because the OS thinks they are the already the same file.

### Safe Rename Pattern (Two-Step `git mv`)

```bash
# 1. Move to a temporary name first
git mv path/to/MyFile.txt path/to/MyFile.txt.tmp

# 2. Move to the final desired lowercase casing
git mv path/to/MyFile.txt.tmp path/to/myfile.txt

# 3. Commit the fix
git commit -m "chore: fix case-sensitivity collision for path/to/myfile.txt"
```

## Gotchas

- **Directory Collisions:** If `Docs/` and `docs/` both exist, all files inside them appear in a single folder on macOS, but are split on Linux. Fixing this requires moving all files from one to the other.
- **Git Config:** `git config core.ignorecase` should typically be `true` on macOS/Windows and `false` on Linux, but this doesn't prevent collisions from being _pushed_ by a case-sensitive system. This guardrail prevents such pushes.
