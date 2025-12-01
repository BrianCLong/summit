# Autonomous CI/CD Pipeline

This document describes the autonomous intelligence layer added to the CI/CD pipeline.

## Features

### 1. Intelligent Failure Classification
The pipeline uses `scripts/ci/smart-runner.js` to wrap key commands. It captures stderr/stdout and classifies failures into semantic categories:
- **INFRASTRUCTURE**: Network timeouts, resource exhaustion (Retriable).
- **CODE_QUALITY**: Linting or type-check errors (Non-retriable).
- **TEST_FAILURE**: Test assertion failures (Non-retriable).
- **BUILD_ERROR**: Compilation failures (Non-retriable).

### 2. Automatic Retry Logic
Based on the classification, "Infrastructure" errors trigger an automatic retry with exponential backoff. This reduces false negatives due to transient environment issues.

### 3. Strict Regression Gates
The pipeline compares current execution metrics against a baseline (stored in GitHub Actions Cache).
- **Duration**: Fails (or warns) if a step takes >20% longer than the baseline.
- **Warnings**: Can be extended to track warning counts.

### 4. Pipeline Health Dashboard
A summary is generated at the end of each run and displayed in the GitHub Actions Job Summary. It highlights:
- Performance regressions.
- Flaky steps (recovered failures).
- Execution duration per step.

### 5. SLSA Compliance
The pipeline now generates SLSA provenance for the build artifacts, ensuring supply chain security.

## Usage

### Local
You can use the smart runner locally:
```bash
node scripts/ci/smart-runner.js --command "npm test" --name "Unit Tests" --retry 2
```

### CI Configuration
The configuration is in `.github/workflows/ci.yml`. It uses:
- `scripts/ci/smart-runner.js`
- `scripts/ci/regression-gate.js`
- `scripts/ci/dashboard.js`
