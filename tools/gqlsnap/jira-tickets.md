# GQLSnap Implementation Jira Tickets

## GQL-1: Establish GQLSnap Tooling Workspace
- **Description:** Set up the isolated `tools/gqlsnap` workspace, scaffolding repository layout and shared configuration to comply with path isolation and determinism requirements.
- **Acceptance Criteria:**
  - Directory structure exists under `tools/gqlsnap/` only; no changes to application/service code.
  - Base package configuration (e.g., `package.json` or equivalent) and README outline CLI usage expectations without external dependencies.
  - Deterministic build/test scripts defined with no network calls.
  - Documentation captures global merge-clean rules and progressive enforcement plan.
- **Subtasks:**
  - Create initial project scaffolding and configuration files.
  - Document development workflow and enforcement timeline.
  - Add scripts/placeholders ensuring offline determinism.

## GQL-2: Implement `gqlsnap capture` Command
- **Description:** Build the CLI command `gqlsnap capture` that stores schema snapshots from a provided GraphQL SDL file.
- **Acceptance Criteria:**
  - Command accepts `--endpoint` pointing to a local schema file (e.g., `schema.graphql`).
  - Captured snapshots are versioned and tagged via `--tag pr-<n>` stored within `tools/gqlsnap` path.
  - Snapshot files are deterministic and hashed for change detection.
  - Command operates offline with no network I/O.
- **Subtasks:**
  - Define command interface and argument parsing.
  - Implement snapshot storage format (text + JSON metadata).
  - Add unit tests verifying snapshot creation and determinism.

## GQL-3: Implement `gqlsnap diff` Command
- **Description:** Deliver the diffing command comparing schema snapshots between a base branch and the current PR tag.
- **Acceptance Criteria:**
  - Command signature `gqlsnap diff --base main --head pr-<n>` compares stored snapshots.
  - Outputs structured diff including type/field additions, removals, and nullability changes.
  - Supports deterministic execution, failing gracefully when snapshots are missing.
  - Generates machine-readable JSON summary alongside human-readable output.
- **Subtasks:**
  - Implement diff algorithm for GraphQL SDL.
  - Build JSON and console reporters for diff results.
  - Write tests covering successful diff and error conditions.

## GQL-4: Breaking Change Detection Rules
- **Description:** Encode schema comparison rules identifying breaking changes (removed types/fields, stricter nullability) and additive changes.
- **Acceptance Criteria:**
  - Breaking vs additive rules align with GraphQL best practices in spec.
  - Detection logic distinguishes removed types, removed fields, and stricter nullability modifications.
  - Rule evaluations are unit-tested with targeted fixtures.
  - Rules integrated with diff command outputs.
- **Subtasks:**
  - Define rule engine structures.
  - Implement rule checks for removals and nullability tightening.
  - Create fixtures validating rule behavior.

## GQL-5: SARIF and Markdown Report Generation
- **Description:** Provide reporting layer that emits SARIF and Markdown summaries listing breaking and additive changes separately.
- **Acceptance Criteria:**
  - SARIF output conforms to schema and is consumable by CI annotation tools.
  - Markdown report lists breaking and additive changes with clear formatting.
  - Reports include command metadata (base/head tags, timestamp) while remaining deterministic.
  - Unit tests snapshot both SARIF and Markdown outputs for stability.
- **Subtasks:**
  - Implement SARIF serializer aligned with diff results.
  - Implement Markdown renderer with deterministic ordering.
  - Add golden snapshot tests for both output formats.

## GQL-6: Fixture Suite Covering Rule Types
- **Description:** Build comprehensive fixture schemas to validate all breaking and additive scenarios.
- **Acceptance Criteria:**
  - Fixtures cover removed types, removed fields, nullability tightening, and purely additive updates.
  - Fixtures reside under `tools/gqlsnap/tests/fixtures` with documented purpose.
  - Tests utilize fixtures to assert diff output and rule classification.
  - Fixture management scripts ensure deterministic ordering and reuse.
- **Subtasks:**
  - Design schema pairs for each rule scenario.
  - Integrate fixtures into automated test suite.
  - Document fixture usage and contribution guidelines.

## GQL-7: Deterministic Test & Snapshot Harness
- **Description:** Establish testing harness ensuring deterministic text and JSON outputs without network dependency.
- **Acceptance Criteria:**
  - Test runner executes offline, using golden snapshots to validate CLI outputs.
  - Snapshot regeneration process documented and version-controlled.
  - Continuous integration job runs tests within isolated path, honoring global determinism rules.
  - Failing tests provide actionable messages highlighting diff mismatches.
- **Subtasks:**
  - Configure test tooling (e.g., Jest, Vitest, or Python equivalent) with snapshot support.
  - Implement utilities to compare current outputs against goldens.
  - Add CI configuration for running the deterministic suite.

## GQL-8: Progressive Enforcement Integration
- **Description:** Integrate GQLSnap into CI with progressive enforcement—initially advisory, switching to blocking after sustained green runs.
- **Acceptance Criteria:**
  - Non-blocking CI check publishes SARIF/Markdown artifacts and PR comment summary.
  - Mechanism documented for flipping the check to blocking after one week of green runs.
  - CI workflow uses only assets under `tools/gqlsnap`; no coupling to runtime services.
  - Check fails PR when breaking changes detected once blocking is enabled.
- **Subtasks:**
  - Add CI workflow step executing capture and diff commands.
  - Configure artifact upload and optional PR comment automation.
  - Document rollout plan and success criteria for enforcing blocking status.
