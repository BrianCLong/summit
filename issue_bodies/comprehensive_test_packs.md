### Context

Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`
Excerpt/why: To ensure the reliability, security, and correctness of the orchestrator, a comprehensive suite of specialized test packs is required. These go beyond standard unit and integration tests to cover critical failure modes and security vulnerabilities.

### Problem / Goal

The current testing strategy is insufficient to guarantee the robustness and security of the orchestrator, especially as autonomy levels increase. There is a need for dedicated test packs that simulate real-world failure scenarios, policy violations, and security exploits. The goal is to implement golden, crash/resume, policy-deny, SSRF, and rollback drill test packs.

### Proposed Approach

- **Golden Test Pack:** Create a set of end-to-end tests with predefined inputs and expected outputs (golden files). These tests will ensure deterministic behavior and prevent regressions.
- **Crash/Resume Test Pack:** Develop tests that simulate orchestrator crashes at various points during task execution and verify that tasks can correctly resume from their last known state.
- **Policy-Deny Test Pack:** Create tests that attempt to perform actions that should be blocked by OPA policies and verify that the policies correctly deny the actions and log audit events.
- **SSRF Test Pack:** Develop tests that attempt to exploit Server-Side Request Forgery (SSRF) vulnerabilities in any component that makes outbound network requests, verifying that the guards are effective.
- **Rollback Drill Test Pack:** Implement tests that simulate failed deployments and verify that the automated rollback mechanism correctly restores the previous stable version.

### Tasks

- [ ] Design the structure and methodology for each test pack.
- [ ] Implement the Golden Test Pack for core orchestrator flows.
- [ ] Implement the Crash/Resume Test Pack.
- [ ] Implement the Policy-Deny Test Pack.
- [ ] Implement the SSRF Test Pack.
- [ ] Implement the Rollback Drill Test Pack.
- [ ] Integrate all test packs into the CI/CD pipeline.

### Acceptance Criteria

- All test packs pass consistently in the CI/CD pipeline.
- The Golden Test Pack ensures deterministic output for core flows.
- The Crash/Resume Test Pack demonstrates successful recovery from simulated failures.
- The Policy-Deny Test Pack confirms that unauthorized actions are correctly blocked.
- The SSRF Test Pack verifies the effectiveness of SSRF guards.
- The Rollback Drill Test Pack confirms successful automated rollbacks.
- Metrics/SLO: Test pack execution time < 30 minutes for all packs.
- Tests: The test packs themselves are the tests.
- Observability: Logs and metrics from test pack executions are available for analysis.

### Safety & Policy

- Action class: N/A (these are tests)
- OPA rule(s) evaluated: N/A

### Dependencies

- Depends on: #<id_of_durable_store_issue>, #<id_of_policy_issue>, #<id_of_cicd_issue>, #<id_of_browser_automation_issue>
- Blocks: Production readiness.

### DOR / DOD

- DOR: Test pack designs and methodologies approved.
- DOD: Merged, all test packs are passing in CI/CD, runbook updated with test pack execution instructions.

### Links

- Code: `<path/to/test/packs>`
- Docs: `<link/to/testing/strategy>`
