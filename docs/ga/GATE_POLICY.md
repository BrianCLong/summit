# Gate Policy

This document describes the Gate Policy for the Summit repository. The policy determines which checks must pass for different stages of the development and release lifecycle.

## Policy Schema

The policy is defined in `ops/gates/gates.yaml` and validated against `schemas/gates/GatePolicy.v0.1.json`.

## Tiers

The policy is divided into three tiers:

### 1. PR Gates

These gates run on every Pull Request.

- **Focus:** Speed and basic correctness.
- **Typical Checks:** Linting, unit tests, basic security scans.
- **Required:** GA Accessibility + Keyboard Smoke (`pnpm run test:a11y-gate` via `.github/workflows/a11y-keyboard-smoke.yml`) with axe artifacts uploaded on every run.
- **Behavior:** Most checks should be blocking. Fast feedback is crucial.

### 2. Nightly Gates

These gates run once every 24 hours (usually overnight).

- **Focus:** Comprehensive verification and long-running tests.
- **Typical Checks:** Full security scans, performance tests, integration tests, fuzzing.
- **Behavior:** Often configured as warn-only to track regression without blocking daily work, but failures should be triaged the next day.

### 3. Release Gates

These gates run before a release is cut (on release branches or tags).

- **Focus:** Production readiness and compliance.
- **Typical Checks:** GA verification, governance checks, final security audits.
- **Behavior:** Strictly blocking. "Stop-the-line" if any gate fails.

## Gate Configuration

Each gate entry in `gates.yaml` consists of:

- `name`: Unique identifier for the gate.
- `command`: The command to execute the gate (e.g., `npm run test:unit`).
- `severity`:
  - `block`: Failure fails the pipeline.
  - `warn`: Failure is reported but does not fail the pipeline.
- `timeout_seconds`: Maximum time allowed for execution.
- `artifacts_expected`: List of artifact paths (files or directories) expected to be produced by the gate.
