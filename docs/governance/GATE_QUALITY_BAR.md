# Governance Gate Quality Bar Packet

**Authority:** This document defines the absolute minimum engineering standards for any new governance gate introduced to the Summit monorepo. It is enforced by the Governance Board and CI/CD pipelines.

**Objective:** Prevent fragile or misleading governance checks by requiring strict determinism, test coverage, and audit-ready artifacts.

---

## A) Gate Quality Bar (Minimum Viable)

To merge a new governance gate script or tool, it must meet **all** of the following requirements. If any check box is unchecked, the PR will be rejected.

### 1. Deterministic Output Requirements

- [ ] **Deterministic Inputs:** The gate must rely solely on committed code, lockfiles, or immutable artifacts.
- [ ] **No Side Effects:** The gate must not modify source files or external state (read-only).
- [ ] **No Network:** The gate must not access the internet (no API calls, no package fetching) during execution. It must run offline using only the checkout.

### 2. Exit Code Semantics

The gate must adhere to the following exit code contract:

- `0`: **Success** or **Warning** (if `strict_mode=false`).
- `1`: **Error** or **Strict Warning** (if `strict_mode=true`). The gate failed a requirement.
- `2`: **Critical Failure**. The gate itself crashed, configuration is missing, or a non-negotiable invariant was violated (e.g., security breach).

### 3. Required Artifacts

The gate must produce the following artifacts in a designated output directory:

- [ ] `report.json`: A machine-readable report following the [Standard Report Schema](#c-standard-report-schema).
- [ ] `report.md`: A human-readable summary (Markdown) for PR comments or dashboards.
- [ ] `stamp.json`: Contains the cryptographic hash of the policy and report.

### 4. Policy Configuration

- [ ] **Configuration File:** Policies must be defined in a dedicated file (YAML/JSON), not hardcoded in scripts.
- [ ] **Schema Version:** The policy file must include a `version` field.
- [ ] **Output Directory:** The policy or CLI args must specify an `out_dir`.
- [ ] **Defaults:** The gate must have safe defaults if the policy file is missing (or fail explicitly with exit code 2).

### 5. Documentation Requirements

- [ ] **Gate Documentation:** A markdown file in `docs/governance/gates/` or `docs/ci/` describing the gate's purpose, inputs, and failure modes.
- [ ] **Frontmatter:** The doc must include a YAML header block with `owner` and `last-reviewed` dates.

---

## B) Required-Check Eligibility Bar

To be promoted to a **Required Check** (blocking PR merges), the gate must meet the Minimum Viable Bar **plus** the following:

- [ ] **Stable Job Name:** The CI job name must be consistent and prefixed with `Governance /` (e.g., `Governance / Lockfile Check`).
- [ ] **Test Coverage:** Core logic must be unit tested with at least **10 test cases**, covering edge cases (empty inputs, malformed policies).
- [ ] **Stability Proven:** 3 consecutive green runs on the `main` branch with no flakes.
- [ ] **Flake Rate:** < 1% failure rate over 30 days.
- [ ] **Performance Budget:** Execution time must be < 2 minutes (p95).
- [ ] **Runbook:** A "Remediation & Rollback" runbook exists in `RUNBOOKS/` explaining how to bypass the gate in an emergency (e.g., `break-glass` procedure).

---

## C) Standard Report Schema

All governance gates must output a `report.json` with this top-level schema:

```json
{
  "version": "1.0.0",
  "policy_hash": "sha256:...",
  "overall": {
    "status": "OK|WARNING|CRITICAL",
    "score": 0-100
  },
  "components": {
    "component_name": {
      "status": "OK|WARNING|CRITICAL",
      "score": 0-100,
      "details": { ... }
    }
  },
  "violations": [
    {
      "rule_id": "rule-name",
      "severity": "WARNING|CRITICAL",
      "message": "Human readable error",
      "file": "path/to/file.ext",
      "line": 10
    }
  ],
  "recommendations": [
    "Run ./scripts/fix.sh to remediate..."
  ]
}
```

**Sorting Rules:** `violations` and `recommendations` arrays must be sorted alphabetically by message/rule_id to ensure deterministic JSON output.

**Timestamp Rules:** `report.json` must NOT contain generation timestamps. Timestamps belong only in `stamp.json` to preserve content-addressable hashing of the report body.

**Hashing Conventions:**
- `policy_hash`: SHA256 of the input policy file.
- `report_hash`: SHA256 of the deterministic `report.json` content.
- `sha`: Git SHA of the commit being verified.

---

## D) CI Integration Standard

### 1. Job Naming

- Pattern: `Governance / <Descriptive Name>`
- Example: `Governance / Policy Validation`

### 2. Artifact Uploads

- All artifacts (`report.json`, `report.md`) must be uploaded using `actions/upload-artifact`.
- Retention: Minimum **30 days**.
- Name: `governance-report-<job_name>-<run_id>`

### 3. Required Steps (YAML Template)

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Run Governance Gate
    run: ./scripts/governance/my-gate.sh --json --out-dir dist/
    env:
      GOVERNANCE_STRICT_MODE: ${{ inputs.strict_mode }}

  - name: Upload Artifacts
    uses: actions/upload-artifact@v4
    with:
      name: governance-report-my-gate
      path: dist/
```

### 4. Unified Gate Integration

If the gate is part of the "Unified Governance Gate", its output must be aggregated into the master evidence bundle.

---

## E) PR Checklist Template

Copy/paste this checklist into the PR description for any new governance gate.

```markdown
## Governance Gate Checklist

### Quality & Reliability
- [ ] **Determinism:** Verified script produces identical output for identical inputs (no timestamps in hashes).
- [ ] **Offline:** Verified script runs without internet access.
- [ ] **Tests:** Added/Updated unit tests (>10 cases for core logic).
- [ ] **Exit Codes:** Verified 0 (Success), 1 (Fail), 2 (Critical/Error).

### Artifacts & Schema
- [ ] **Schema:** `report.json` follows the Standard Report Schema v1.0.0.
- [ ] **Human Readable:** Generates `report.md` summary.
- [ ] **Sorting:** JSON arrays are sorted for stability.

### CI/CD
- [ ] **Job Name:** Prefixed with `Governance /`.
- [ ] **Artifacts:** CI uploads reports with 30-day retention.
- [ ] **Performance:** Runs in under 2 minutes.

### Documentation & Policy
- [ ] **Doc:** Created `docs/governance/gates/<gate-name>.md`.
- [ ] **Owner:** Added `owner` and `last-reviewed` to frontmatter.
- [ ] **Policy:** Defined default policy in `docs/governance/policies/`.
```
