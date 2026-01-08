# GA Gate Stability

This document outlines known failure modes for the `ci-gate` and `ga:verify` processes, along with mitigation steps and rerun commands.

## Known Failure Modes

### 1. Service Startup Timeouts

- **Error Signature:** `❌ Service failed to become ready after 60 attempts.`
- **Description:** The application services take longer than the allotted 120 seconds to start up and become healthy. This can be caused by slow network, heavy machine load, or race conditions during initialization.
- **Mitigation:**
  - The timeout has been increased to 120 seconds to provide more buffer.
  - If this failure persists, check the logs of the `gateway` service for startup errors: `docker compose -f docker-compose.dev.yaml logs gateway`
- **Rerun Command:**
  ```bash
  make ga
  ```

### 2. Suppressed Test Failures

- **Error Signature:** The `ci-gate` job passes, but subsequent integration or smoke tests fail unexpectedly.
- **Description:** Previously, test failures were suppressed in the `Makefile` and `server/package.json`, which could lead to an unstable `main` branch.
- **Mitigation:**
  - The `|| true` and `--passWithNoTests` flags have been removed from the test commands.
  - Test failures will now correctly fail the `ci-gate` and `ga:verify` jobs.
- **Rerun Command:**
  ```bash
  make test
  ```

### 3. Inconsistent Tooling

- **Error Signature:** `pnpm` vs. `npm` dependency mismatches, or errors related to incorrect package versions.
- **Description:** The repository has a mix of `pnpm` and `npm` commands, which can lead to inconsistent dependency installation and tooling drift.
- **Mitigation:**
  - The `ga:verify` script has been streamlined to use `pnpm` consistently.
- **Rerun Command:**
  ```bash
  pnpm install && make ga
  ```

## Environment Constraints

- The `ga:verify` process requires Docker and Docker Compose to be installed and running.
- The process binds to ports `3000` and `8080` on the host machine. Ensure these ports are free before running the gate.
