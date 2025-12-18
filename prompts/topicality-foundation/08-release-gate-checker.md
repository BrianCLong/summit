# Prompt 8: Release Gate Checker for CI (Canary & Rollback Logic)

**Tier:** 3 - Automation & Tooling
**Priority:** ⭐️ RELEASE BLOCKER
**Effort:** 3 days
**Dependencies:** Prompts 5, 7, 10
**Blocks:** Production releases
**Parallelizable:** No (needs Prompt 5)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- Release gate policy:
  - Every release needs SBOM, SLSA provenance, risk assessment, DPA/DPIA (if applicable), rollback plan, and disclosure pack.
  - Canary policy: 10% traffic slice, success criteria on error_rate, latency_p95, cost/req, etc.
  - Auto-rollback triggers: SLO breach, security finding, data policy violation.

Goal:
Implement a "release gate checker" that:
- runs in CI/CD,
- validates that a release meets the gate requirements,
- outputs a clear pass/fail with reasons,
- optionally emits a machine-readable report.

Assumptions:
- Use TypeScript/Node or Python for a CLI tool.
- Inputs are file paths and environment variables in CI.

Requirements:
1. Inputs
   - Path to Disclosure Pack (from Prompt 5).
   - SLO targets (config file or env vars).
   - Recent metrics snapshot (e.g., JSON with error_rate, latency_p95, cost_per_request).
   - Security scan results and policy checks (can be stubbed as JSON).

2. Checks
   - Verify Disclosure Pack completeness:
     - SBOM present,
     - SLSA provenance present,
     - risk assessment not empty,
     - rollback plan not empty.
   - Verify canary configuration:
     - traffic_slice == 10% (or configured),
     - success criteria present.
   - Verify auto-rollback triggers are defined.
   - Verify no critical policy violations in security/policy reports.

3. Output
   - Exit code:
     - 0 for pass,
     - nonzero for fail.
   - Human-readable summary (stdout).
   - Machine-readable JSON report with:
     - pass/fail,
     - list of checks and statuses,
     - suggested remediation.

4. CI integration example
   - Provide sample GitHub Actions or generic CI configuration step.

5. Tests & docs
   - Unit tests for each check.
   - README explaining:
     - configuration,
     - inputs/outputs,
     - how to interpret failures.

Deliverables:
- CLI tool code.
- Sample config and input JSONs.
- Tests and README.
