# Required Checks for Branch Protection

To ensure the integrity of the `main` branch and release branches, the following GitHub Actions checks must be configured as **Required** in the repository settings.

## 1. CI Pass
* **Check Name:** `CI Pass`
* **Workflow:** `CI` (`.github/workflows/ci.yml`)
* **Purpose:** Aggregates linting, typechecking, unit tests, integration tests, SOC controls, and version verification.

## 2. Security Pass
* **Check Name:** `Security Pass`
* **Workflow:** `Security and Compliance Suite` (`.github/workflows/ci-security.yml`)
* **Purpose:** Aggregates secret scanning, SAST, dependency scanning, container scanning, and policy enforcement.

**Note:**
By requiring only these two aggregate jobs, we avoid "branch protection drift" where new individual jobs are added but forgotten in the protection rules.
