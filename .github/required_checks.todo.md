# Required Checks for Infrastructure Governance

The following checks are expected to be enforced in GitHub Actions (or the CI provider) for all PRs modifying infrastructure or policy configurations:

1. `summit-infra-verify` - Verifies the infrastructure registry model and metadata.
2. `summit-policy-verify` - Verifies that proposed configurations conform to defined OPA policies (currently deny-by-default).
3. `summit-scaffolder-verify` - Verifies that new components scaffolded from templates meet the minimum metadata requirements.

**Action Required for GA:** Setup these branch protection required checks in the repository settings.
