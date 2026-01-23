# Server TypeScript Exclusion Freeze Policy

**Effective Date:** 2026-01-22
**Status:** ENFORCED

## 1. The Policy

The `exclude` list in `server/tsconfig.json` is **FROZEN**.
You may **NOT** add new files to this list to bypass TypeScript errors.

## 2. Why?

Historically, broken files were "fixed" by excluding them from compilation. This has led to:

- 200+ files being invisible to the compiler.
- Broken refactors (renaming a symbol breaks excluded files silently).
- A false sense of security in CI.

## 3. How to Handle Errors in New/Changed Files

If you are working on a file and `tsc` reports errors, you have two options:

### Option A: Fix the Types (Preferred)

Resolve the errors properly.

### Option B: Explicit Opt-Out (If deadline is critical)

Add `// @ts-nocheck` to the very first line of the file.

- **Pros:** The file remains part of the project graph. Imports are resolved. Renames work.
- **Cons:** No type safety inside the file.
- **Why this is better:** It is explicit, local to the file, and easier to track/burn down than a hidden list in `tsconfig.json`.

## 4. How to Remove Files from Excludes

We encourage removing files from the `exclude` list!

1.  Remove the line from `server/tsconfig.json`.
2.  Run `npm run typecheck` in `server/`.
3.  If errors exist, add `// @ts-nocheck` to the file(s).
4.  Update the hash in `scripts/ci/verify_tsconfig_excludes_frozen.mjs`.

## 5. CI Enforcement

The `verify_tsconfig_excludes_frozen.mjs` script runs in CI. It verifies:

- The number of excluded files has not increased.
- The content of the list matches the frozen snapshot.
