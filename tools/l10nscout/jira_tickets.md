# L10nScout — Jira Ticket Pack

All tickets inherit the global merge-clean rules:
- Path isolation: only create/use `tools/l10nscout/**` and generated `i18n/catalog/**`; do not modify existing app/service code.
- Zero runtime coupling: tools/libs must run in CI or as opt-in utilities; avoid gateway/schema changes.
- Determinism: ensure outputs have golden snapshots and tests avoid network I/O.
- Progressive enforcement: start new checks as non-blocking and flip to blocking after one week of green runs.

---

## Ticket 1 — feat(l10nscout): scaffold CLI workspace
**Summary:** Establish the project structure and tooling needed to build and distribute the L10nScout CLI.

**Acceptance Criteria**
- `tools/l10nscout/` contains an initialized package/module skeleton with build tooling (e.g., Go/Node/Rust) agreed upon by the team.
- CLI entry point created with a placeholder command that prints help text and version.
- Project configuration enforces formatting/linting consistent with repository standards.
- README outlines CLI purpose, installation, and contribution guidelines.

**Subtasks**
- Choose implementation language and set up dependency management files.
- Add lint/format scripts and integrate with repo tooling (e.g., `package.json`, `go.mod`).
- Implement `l10nscout --help` with command descriptions.
- Draft README with usage overview and conventions.

---

## Ticket 2 — feat(l10nscout): implement string extraction pipeline
**Summary:** Build the extractor to parse TS/React/Go templates from `apps/**` and emit catalogs under `i18n/catalog`.

**Acceptance Criteria**
- `l10nscout extract --src apps/** --out i18n/catalog` scans TS/TSX/JSX and Go template files for translatable strings.
- Extracted messages include metadata (file path, key, default text, developer comments).
- Output catalog is deterministic; rerunning without source changes yields zero diff.
- Extraction respects ignore patterns/config defined in repo (e.g., test files, mock data).

**Subtasks**
- Define parsing strategy for TypeScript/React and Go templates (AST or regex-based with tests).
- Implement catalog writer with stable ordering and formatting.
- Add configuration file for customizing include/exclude patterns.
- Create smoke tests covering sample TSX and Go files.

---

## Ticket 3 — feat(l10nscout): placeholder validation engine
**Summary:** Validate placeholder usage (ICU, interpolations) across extracted strings and translations.

**Acceptance Criteria**
- `l10nscout check` inspects ICU plural/select placeholders and template variables for syntactic correctness.
- Reports mismatches between source and localized placeholders (missing, extra, or renamed tokens).
- Handles pluralization rules and ICU syntax including nested placeholders.
- Emits human-readable validation report and machine-readable JSON summary.

**Subtasks**
- Implement parser/validator for ICU message syntax.
- Compare placeholders between base and localized strings and categorize mismatches.
- Create fixtures with pluralization and RTL samples to cover edge cases.
- Add unit tests for failure and success scenarios.

---

## Ticket 4 — feat(l10nscout): localization coverage reporting
**Summary:** Provide coverage metrics for target languages (`fr`, `de`) and highlight missing or unused keys.

**Acceptance Criteria**
- `l10nscout check --lang fr,de` outputs per-language coverage percentages and counts of missing/unused keys.
- CLI distinguishes between untranslated, fuzzy, and fully translated entries.
- Reports integrate with CI logs without failing builds (warning-only) for the first rollout week.
- Coverage data written to deterministic snapshot files for regression tracking.

**Subtasks**
- Implement coverage calculator comparing base catalog to localized catalogs.
- Format CLI output for CI readability and optional JSON export.
- Add warning-only flag default with TODO to switch to blocking after grace period.
- Write tests ensuring repeated runs produce identical output artifacts.

---

## Ticket 5 — feat(l10nscout): golden fixture suite
**Summary:** Create comprehensive fixtures (pluralization, ICU placeholders, RTL text) and snapshot tests ensuring determinism.

**Acceptance Criteria**
- Test suite includes fixtures covering plurals, gender select, ICU formatting, and RTL examples.
- Snapshot tests verify extractor and checker outputs remain unchanged across runs.
- Tests run without external network dependencies and complete within CI time limits.
- Document fixture structure and how to regenerate snapshots safely.

**Subtasks**
- Build fixture directories under `tools/l10nscout/test-fixtures` (or similar) with representative source files.
- Author test harness invoking `l10nscout extract` and `l10nscout check` against fixtures.
- Configure deterministic ordering (e.g., sort keys, stable timestamps) before snapshotting outputs.
- Update documentation with instructions to add new fixtures.

---

## Ticket 6 — chore(l10nscout): CI integration (non-blocking rollout)
**Summary:** Wire L10nScout commands into CI with progressive enforcement per global rules.

**Acceptance Criteria**
- CI workflow runs `l10nscout extract` and `l10nscout check --lang fr,de` on pull requests touching localized files.
- First week: failures surface as warnings/comments without failing the pipeline.
- After predefined date or condition, toggle enforcement to blocking status.
- CI logs link to generated reports stored as artifacts.

**Subtasks**
- Update or add CI job invoking L10nScout steps with conditional execution.
- Implement mechanism (flag, environment variable, or config) controlling warning-only mode.
- Document schedule/process to move from warning to blocking.
- Verify CI run picks up generated artifacts in test pipeline.

---

## Ticket 7 — chore(l10nscout): developer ergonomics & docs
**Summary:** Provide tooling, scripts, and documentation for developers to adopt L10nScout locally.

**Acceptance Criteria**
- Developer guide explains installation, running extract/check commands, and interpreting reports.
- Add convenience script or npm/yarn task to run L10nScout locally with repo defaults.
- Troubleshooting section covers common placeholder/coverage issues.
- Docs clarify where generated catalogs live and how to handle merge conflicts.

**Subtasks**
- Create `tools/l10nscout/README.md` or expand existing docs with step-by-step instructions.
- Add wrapper script (e.g., `just l10nscout-check` or npm script) respecting path isolation.
- Gather FAQ items from early adopters and document resolutions.
- Ensure docs reference global merge-clean rules and deterministic outputs.

---

## Ticket 8 — chore(l10nscout): release & ownership handoff
**Summary:** Finalize versioning, ownership, and monitoring for the L10nScout tool.

**Acceptance Criteria**
- Establish versioning scheme (semantic versioning) and initial release notes for v0.1.0.
- Identify code owners/maintainers and add to appropriate metadata (e.g., CODEOWNERS entry for `tools/l10nscout/**`).
- Document onboarding checklist and support expectations for localization teams.
- Confirm storage/rotation plan for generated catalogs and golden snapshots.

**Subtasks**
- Draft release notes summarizing initial feature set and limitations.
- Update repository metadata to include ownership and escalation paths.
- Create maintenance checklist (updating catalogs, reviewing warnings, toggling CI enforcement).
- Schedule follow-up review after first enforcement week to assess blockers.

