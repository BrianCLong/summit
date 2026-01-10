# Flake Registry (Quarantine Policy)

The flake registry is the only sanctioned escape hatch for flaky tests, workflow jobs, and lint
suppressions. Entries are time-boxed, owned, ticketed, and enforced by CI. These are treated as
**Governed Exceptions** with explicit expiration and ownership.

**Authority:** `docs/SUMMIT_READINESS_ASSERTION.md`

## Registry Location

- Registry: `.github/flake-registry.yml`
- Schema: `schemas/flake-registry.schema.json`

## Entry Format

Each entry is a single, explicit allowance:

```yaml
- id: coe-ci-test-suite
  scope: workflow-job
  target: workflow:ci.yml#test
  owner: @summit-release
  ticket: https://github.com/summit/IntelGraph/issues/12345
  created: 2026-01-10
  expires: 2026-01-24
  rationale: ESM test failures block migration work.
  mitigation: retry wrapper
```

### Fields

| Field                 | Meaning                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `id`                  | Unique, stable identifier used in workflows and comments.            |
| `scope`               | One of `unit-test`, `integration-test`, `workflow-job`, `lint-rule`. |
| `target`              | Exact test name, file path, or workflow job/step identifier.         |
| `owner`               | GitHub handle accountable for remediation.                           |
| `ticket`              | URL of the tracking issue.                                           |
| `created` / `expires` | Hard stop window (YYYY-MM-DD).                                       |
| `rationale`           | One-line explanation for the exception.                              |
| `mitigation`          | The approved quarantine mechanism (retry, skip, etc.).               |

### Target Formats

- **Workflow jobs:** `workflow:<workflow-file>#<job-id>`
- **Workflow steps:** `workflow:<workflow-file>#<job-id>/<step-name>`
- **Jest tests:** `jest:<test name>` (must match the test name passed to `quarantinedTest`)
- **Lint rules:** `lint:<rule-id>@<file>`

## Quarantine Usage

### Jest tests

Use the helper installed by `tests/utils/jest-setup.cjs`:

```ts
quarantinedTest("flake-id", "does X reliably", async () => {
  // test body
});
```

If a retry is used, an encounter record is written to `artifacts/flake/flake-encounters.jsonl`.

### Workflow jobs

Any `continue-on-error: true` must include an inline `flake-id` comment and a registry entry:

```yaml
- name: SBOM policy check
  continue-on-error: true # flake-id: coe-pr-quality-gate-sbom
```

### Lint suppressions

Lint suppressions added in a PR must include a `flake-id` comment tied to a `lint-rule` entry.
This enforcement is scoped to changed files to avoid legacy churn.

```ts
// eslint-disable-next-line no-console -- flake-id: lint-no-console-cli
```

## Reporting

- `scripts/ci/flake-registry-report.ts` outputs weekly flake debt summaries.
- Release SLO reports include flake debt counts, expirations, and encounter totals.
- The scheduled **Flake Debt** issue is auto-updated with the registry table.

## Enforcement

CI enforces:

- Registry schema validity and expiry windows.
- No `continue-on-error` without registry coverage.
- Lint suppressions in touched files must be registry-backed.
- Quarantine usage is surfaced in workflow summaries and release SLO reports.
