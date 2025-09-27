### Context
Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`
Excerpt/why: To ensure that autonomously generated code is safe and correct, it must be accompanied by a comprehensive suite of unit tests. A dedicated worker for test generation is a core component of the build process.

### Problem / Goal
The system can generate code, but it cannot currently generate unit tests for that code. This means that new code is not automatically validated, increasing the risk of regressions and bugs. The goal is to create a worker that uses a code-specialized LLM to generate unit tests based on a code diff.

### Proposed Approach
- Create a new worker type: `test-generation-worker`.
- The worker will receive a code diff (e.g., from a git commit or a staging area) as input.
- The worker will format the diff into a prompt for a code-specialized LLM (e.g., Codex, Gemini Code).
- The prompt will instruct the LLM to generate unit tests for the new or modified code, following the existing testing conventions of the target repository.
- The worker will receive the generated tests, validate their syntax, and save them as a patch file.
- The output will be a `diff-only` contract, meaning the worker only provides the new test code, not the original code.

### Tasks
- [ ] Design the contract for the `test-generation-worker` (input: diff, output: test patch).
- [ ] Implement the worker logic, including prompting the code LLM.
- [ ] Add logic to detect the testing framework and conventions of the target repository.
- [ ] Implement a validator for the generated test code.
- [ ] Add E2E tests that provide a code diff and verify the generated tests.

### Acceptance Criteria
- Given a diff for a new function, when the worker is invoked, then it generates a valid set of unit tests for that function.
- The generated tests must be deterministic for a given input diff and model version.
- The worker's output must be a patch file containing only the new test code.
- Metrics/SLO: Test generation success rate > 90%; code coverage delta tracked for each run.
- Tests: E2E tests with golden file diffs and expected test outputs.
- Observability: Logs for each test generation run, including the prompt and the generated output.

### Safety & Policy
- Action class: WRITE (generates new test files)
- OPA rule(s) evaluated: The worker must have permission to write to the test directory.

### Dependencies
- Depends on: #<id_of_router_issue>
- Blocks: Autonomous code merging and deployment.

### DOR / DOD
- DOR: Prompt design and `diff-only` contract approved.
- DOD: Merged, E2E tests passing, worker is integrated into the main orchestration flow.

### Links
- Code: `<path/to/workers/test_generation>`
- Docs: `<link/to/worker/contract>`
