# Ratelaw DSL Compiler Jira Plan

_Global constraints for all tickets:_
- Scope limited to `tools/ratelaw/**`.
- No coupling to runtime services; compiler and tests run as optional tooling.
- Deterministic outputs with golden snapshots; no network I/O in tests.
- Progressive enforcement: begin as non-blocking CI checks, toggle to blocking after one week of passing.
- Follow existing repo merge hygiene rules.

## RLAW-1: CLI Scaffolding for `ratelaw`
**Objective:** Deliver a command-line entry point `ratelaw compile` that accepts `--in` and `--out` flags.

**Acceptance Criteria**
- Running `ratelaw compile --in limits.rl --out limits.json` reads the DSL source and writes JSON policies to the target path.
- Help output documents flags and usage.
- Command exits with non-zero status on invalid input paths or compile failures.

**Subtasks**
1. Create CLI wrapper executable (Node/TS or Python) in `tools/ratelaw`.
2. Wire argument parsing and delegate to compiler module.
3. Document usage in README snippet within the package.

## RLAW-2: Define DSL Grammar and Parser
**Objective:** Implement a parser for the rate-limit DSL that produces an internal AST.

**Acceptance Criteria**
- DSL grammar covers buckets, windows, keys, burst, and strategy definitions.
- Parser rejects malformed syntax with actionable error messages.
- AST structure supports downstream JSON serialization without loss of information.

**Subtasks**
1. Draft grammar specification and inline docs.
2. Implement parser with unit coverage on representative samples.
3. Expose parser module for reuse by compiler and tests.

## RLAW-3: JSON Policy Schema Implementation
**Objective:** Generate JSON output that aligns with the agreed schema (`buckets`, `window`, `keys`, `burst`, `strategy`).

**Acceptance Criteria**
- Compiler translates AST into schema-compliant JSON.
- Output validates against JSON Schema definition committed to the repo.
- Serialization is deterministic (stable key ordering, consistent formatting).

**Subtasks**
1. Author JSON Schema document describing policy structure.
2. Implement serializer that maps AST nodes to schema format.
3. Add schema validation step to compiler pipeline.

## RLAW-4: Round-Trip Formatting Stability
**Objective:** Ensure DSL files can be compiled and re-formatted without diff churn.

**Acceptance Criteria**
- `ratelaw compile` followed by pretty-printing/fmt of DSL source yields identical output on repeated runs.
- Formatter or normalizer is idempotent on supported syntax.
- Provide regression test demonstrating round-trip stability.

**Subtasks**
1. Implement DSL formatter or canonicalizer.
2. Integrate formatter into compile or auxiliary command.
3. Add golden test proving no diff between successive runs.

## RLAW-5: Golden Fixture Test Suite
**Objective:** Establish deterministic golden tests covering representative DSL inputs.

**Acceptance Criteria**
- Fixture directory holds DSL inputs and expected JSON outputs.
- Test harness compiles each DSL file and compares to the golden snapshot.
- Updates to snapshots require explicit developer action (documented script or instructions).

**Subtasks**
1. Create `fixtures/golden` (or similar) structure for DSL/JSON pairs.
2. Implement test runner that iterates fixtures.
3. Document snapshot update procedure in README.

## RLAW-6: Negative Syntax Coverage
**Objective:** Add tests to confirm invalid DSL constructs are rejected.

**Acceptance Criteria**
- Tests cover missing sections, unknown keys, and type mismatches.
- Compiler returns descriptive errors without generating output files.
- CI reports failures when new invalid syntax slips through.

**Subtasks**
1. Enumerate invalid DSL cases based on grammar.
2. Implement tests asserting thrown errors and messages.
3. Ensure CLI propagates error codes for invalid cases.

## RLAW-7: Schema Backward Compatibility Guard
**Objective:** Prevent breaking changes to the JSON policy schema.

**Acceptance Criteria**
- Automated check compares current schema to the previous baseline and fails on incompatible changes.
- Process documented for updating baseline when intentional changes occur.
- CI integration runs the guard as part of ratelaw test suite.

**Subtasks**
1. Store baseline schema snapshot within repository.
2. Implement compatibility checker script/tool.
3. Hook compatibility check into CI workflow for this package.

## RLAW-8: PR Comment Summary Automation
**Objective:** Emit a concise pull-request comment summarizing compiler changes and test status.

**Acceptance Criteria**
- Tooling posts (or prints for CI to post) a summary including DSL→JSON coverage and test results.
- Comment content is deterministic and safe for repeated runs.
- Document instructions for integrating with existing PR automation.

**Subtasks**
1. Define summary template covering key metrics.
2. Implement script to generate summary after tests run.
3. Provide guidance for hooking into current CI comment workflows.

