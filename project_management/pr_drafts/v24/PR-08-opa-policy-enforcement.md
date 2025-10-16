# PR 8 — OPA Policy Enforcement in CI + Unit Test

Title: chore(policy): add conftest gate and unit test for conductor tenant isolation

Files:

- .github/workflows/policy-check.yml (new)
- opa/policies/conductor-tenant-isolation_test.rego (new)

Workflow (new): runs `conftest test` on `opa/**` and `charts/**`.

Test (new): minimal Rego test asserting cross‑tenant access denied.

Acceptance: CI fails on policy violations; tests green.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
