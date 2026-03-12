# Integration Smoke Tests

This directory contains lightweight integration smoke tests that validate the critical happy paths across Summit's key subsystems after deployment.

## Running the Suite

You can run the smoke tests by executing the `suite.sh` script:

```bash
./tests/smoke/suite.sh
```

All tests require only the `GITHUB_TOKEN` environment variable (if running branch protection checks against the GitHub API). No other credentials are required. Note that this suite is read-only and will not modify production state.

## What it Checks

1. **Evidence Artifact Pipeline**: Verifies that evidence is generated, validates against the provided schemas, and passes determinism checks if applicable scripts exist.
2. **Branch Protection**: Checks the GitHub API to confirm that required branch protection rules are active on the `main` branch.
3. **CI Gate**: Ensures that at least one security/policy GitHub Actions workflow exists and is valid YAML.
4. **Governance Ledger**: Checks that the `security-ledger` directory contains at least one entry that validates against its schema.
5. **Health Check**: Confirms that the main health check endpoint/script (`scripts/health-check.sh` or similar) exists and responds appropriately.

## Adding New Tests

To add a new smoke test, edit `tests/smoke/suite.sh` and add a new `run_test` call following the existing pattern:

```bash
run_test "my_test_name" "brief description of what it checks" "
    # Your bash command here.
    # The command should exit with status 0 for PASS, and non-zero for FAIL.
    # The test will automatically run with a 30s timeout.
"
```
