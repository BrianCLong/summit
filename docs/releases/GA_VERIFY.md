# Runbook: GA Verification

## 1. Purpose

This runbook provides the steps to verify the General Availability (GA) readiness of the Summit Platform. Its purpose is to ensure that the codebase, system health, and compliance artifacts meet all requirements for a GA release.

## 2. Prerequisites

*   You have `pnpm` and `make` installed and configured in your local environment.
*   For the full GA gate, Docker must be running.
*   Your local `main` branch is up-to-date with the upstream repository.

---

## 3. Step-by-Step Instructions

There are three levels of verification, from a quick CI-friendly check to a comprehensive local validation.

### Step 3.1: Quick Verification (CI-friendly)

This is the fastest check and is used in the main CI pipeline for pre-merge validation.

```bash
# Run the single deterministic verification command
pnpm ga:verify
```

This command executes the following checks in sequence:
1.  **TypeScript check** (`pnpm typecheck`)
2.  **Lint** (`pnpm lint`)
3.  **Build** (`pnpm build`)
4.  **Unit tests** (`pnpm --filter server test:unit`)
5.  **Smoke tests** (`pnpm ga:smoke`)

### Step 3.2: Full GA Gate (Local, requires Docker)

This is the comprehensive verification that should be run locally before a release cut. It includes starting services and running deeper integration tests.

```bash
# Run the full GA gate
make ga
```

This command performs the following actions:
1.  Lint and Unit Tests
2.  Clean Environment (`docker compose down`)
3.  Services Up (`docker compose up -d`)
4.  Readiness Check (service health probes)
5.  Deep Health Check
6.  Smoke Tests
7.  Security Checks (SBOM generation, secrets scan)

### Step 3.3: Governance and Compliance Verification

These commands verify the integrity of governance and compliance artifacts. They are run as part of the `release-governance` CI workflow.

```bash
# Verify that documentation is in sync with the codebase
pnpm verify:living-documents

# Generate and validate the Software Bill of Materials (SBOM)
pnpm generate:sbom

# Generate and validate SLSA provenance data
pnpm generate:provenance
```

---

## 4. Expected Artifacts

Successful runs of these commands will produce the following artifacts:

*   **`make ga`**:
    *   `artifacts/ga/ga_report.json`: A machine-readable report of the GA gate results.
    *   `artifacts/ga/ga_report.md`: A human-readable summary of the GA gate results.
*   **`pnpm generate:sbom`**:
    *   `artifacts/sbom/sbom.json`: The generated SBOM in CycloneDX format.
*   **`pnpm generate:provenance`**:
    *   `artifacts/provenance/provenance.json`: The SLSA provenance attestation.

---

## 5. Failure Modes & Rerun Commands

If any verification step fails, use the following commands to diagnose and troubleshoot the issue.

| Failure Mode                 | Rerun Command for Diagnosis                                   |
| ---------------------------- | ------------------------------------------------------------- |
| **TypeScript Errors**        | `pnpm typecheck`                                              |
| **Linting Violations**       | `pnpm lint`                                                   |
| **Build Failure**            | `pnpm build`                                                  |
| **Unit Test Failure**        | `pnpm --filter server test`                                   |
| **Service Health Check Fails** | `make logs` (to view Docker logs), then `make health`         |
| **Smoke Test Fails**         | `pnpm ga:smoke`                                               |
| **Governance Drift**         | `pnpm verify:living-documents --fix` (to attempt auto-fix)    |
