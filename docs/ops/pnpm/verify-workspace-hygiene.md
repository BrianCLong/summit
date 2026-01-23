# Verify PNPM Workspace Hygiene

## Purpose

Ensures workspace metadata is consistent and internal references use `workspace:`.

## Run

```bash
node scripts/ci/verify_pnpm_workspace_hygiene.mjs
```

## Checks

- `pnpm-lock.yaml` exists and contains importers for workspace packages.
- No duplicate workspace package names.
- Every workspace package has valid `name` and `version` fields.
- Internal dependencies use `workspace:` (flags relative paths or non-workspace refs).

