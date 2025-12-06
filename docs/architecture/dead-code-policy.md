# Dead Code Detection & Cleanup Policy

## Purpose

This policy establishes how we identify, review, and retire dead code so the platform stays
maintainable and secure. The automation introduced by the dead-code bot must follow these guardrails
to keep changes safe and auditable.

## What counts as dead

- **Unused exports:** functions, classes, constants, and types that are exported but never
  referenced in the dependency graph.
- **Unreferenced modules:** source files that are not imported (directly or transitively) by any
  runtime or build entrypoint.
- **Obsolete configs:** configuration files or settings that are no longer consumed by build
  tooling, deployment workflows, or runtime services.

## Exclusions and keep rules

- Code marked with explicit **KEEP** annotations or `@experimental`/`@keep` tags is exempt from
  automated removal.
- Test fixtures, benchmark harnesses, or one-off migration scripts are excluded unless they are
  explicitly marked for deletion.

## Grace policy and timelines

- **Experimental code:** must include an `@experimental` or `@keep` tag plus a short justification
  in a leading comment. It may remain for up to **two release cycles** (or 60 days) before review.
  After that window, the owner must either integrate it into a supported path or tag it for removal.
- **Inactive features:** if a feature flag, route, or integration remains disabled for more than
  **one release cycle** and has no active consumers, it will be queued for removal.
- **Config drift:** configs that are unused for **30 days** (per analyzer report) will be proposed
  for deletion.

## Detection and verification process

1. **Automated scan:** `scripts/cleanup/find-dead-code.ts` runs static analysis, TypeScript language
   service queries, and bundler/coverage metadata to find unused exports and unreferenced modules.
   It produces `reports/dead-code-report.json` grouped by code owner when possible.
2. **Human review:** code owners validate the findings, confirm KEEP/experimental exemptions, and
   decide whether to keep, refactor, or delete candidates.
3. **Auto-cleanup (dry run first):** `scripts/cleanup/create-dead-code-pr.ts` prepares deletion
   branches in **dry-run** mode until we explicitly enable PR creation.
4. **Verification:** proposed deletions must pass lint, type-check, and regression tests before
   merging. High-risk areas (auth, billing, data pipelines) require an additional manual sign-off.

## Documentation and traceability

- Every cleanup PR must link back to this policy and attach the relevant section of
  `reports/dead-code-report.json`.
- The bot will refuse to delete code when ownership is ambiguous; owners must be clarified in
  `CODEOWNERS` before proceeding.

## Enablement checklist (post-dry-run)

- ✅ Analyzer enabled in CI on a schedule.
- ✅ Dry-run PR generator produces candidate summaries.
- ⬜ Real PR generation enabled after two consecutive clean dry-run cycles with owner approval.
