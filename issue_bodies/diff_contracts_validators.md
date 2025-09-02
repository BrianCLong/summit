### Context

Source: `Orchestration Code Review — Semi-Autonomous Build (v0)`
Excerpt/why: When autonomously generating code or tests, it is crucial to ensure that the output is precise and only modifies the intended parts of the codebase. This requires a clear contract for the generated output (diff-only) and robust validation of the resulting patches.

### Problem / Goal

Without strict controls, autonomously generated code could introduce unintended changes, leading to regressions or security vulnerabilities. The current system may not have mechanisms to enforce that generated output is limited to a specific diff or to validate the integrity and correctness of patches before they are applied. The goal is to implement a "diff-only" contract for all code-generating workers and to develop robust patch validators.

### Proposed Approach

- All workers that generate code (e.g., code-LLM, test generation) will be strictly enforced to produce output only in the form of a diff (e.g., a Git patch file).
- Implement a patch validator component that will be used before applying any generated patch to the codebase.
- The validator will check for:
  - **Syntactic correctness:** Ensures the patch is well-formed.
  - **Semantic correctness:** (where possible) Ensures the patch does not introduce syntax errors or break existing code.
  - **Scope adherence:** Verifies that the patch only modifies files and lines within the expected scope.
  - **Security checks:** Scans for common vulnerabilities introduced by the patch.
- The validator will integrate with the CI/CD pipeline to prevent invalid patches from being merged.

### Tasks

- [ ] Define the standard format for diff-only contracts.
- [ ] Implement the core patch validator component.
- [ ] Integrate the patch validator into the CI/CD pipeline.
- [ ] Update existing code-generating workers to adhere to the diff-only contract.
- [ ] Add unit and integration tests for the patch validator.
- [ ] Add E2E tests that attempt to apply invalid patches and verify they are rejected.

### Acceptance Criteria

- Given a generated patch, when it contains unintended modifications (e.g., outside the specified scope), then the patch validator rejects it.
- All code-generating workers produce output strictly as diffs.
- The patch validator can identify and reject syntactically incorrect patches.
- Metrics/SLO: Patch validation success rate > 99%; invalid patch rejection rate > 95%.
- Tests: Comprehensive test suite for the patch validator, including edge cases and malicious inputs.
- Observability: Logs for patch validation results, including reasons for rejection.

### Safety & Policy

- Action class: WRITE (applies patches)
- OPA rule(s) evaluated: The patch validator is a critical safety gate for all code modifications.

### Dependencies

- Depends on: #<id_of_cicd_issue>
- Blocks: Autonomous code merging.

### DOR / DOD

- DOR: Diff-only contract and patch validation design approved.
- DOD: Merged, patch validator integrated into CI/CD, E2E tests passing.

### Links

- Code: `<path/to/patch/validator>`
- Docs: `<link/to/diff_contract_spec>`
