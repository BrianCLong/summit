# GA OS Migration Guide

This guide provides instructions for repository maintainers to adopt the new federated General Availability (GA) Operating System. Adopting this system will standardize your release evidence and integrate your project into the portfolio-wide governance dashboards.

## Prerequisites

- Your repository must use a `package.json` file for managing scripts.
- You must have the ability to add and modify GitHub Actions workflows.

## Step 1: Install the Shared Tooling Package

The first step is to add the `summit-ga-os` package to your repository's development dependencies.

```bash
pnpm add -D @summit/ga-os
```

## Step 2: Initialize the GA OS

The shared tooling package includes an `init` command that will bootstrap the necessary configuration files and CI workflow templates.

```bash
pnpm exec summit-ga-os init
```

This command will:
1.  Create a `.ga-os.config.json` file in your repository root.
2.  Add a new GitHub Actions workflow file at `.github/workflows/ga-os-compliance.yml`.
3.  Add the standard GA OS commands to your `package.json` scripts.

## Step 3: Configure the GA OS

Open the newly created `.ga-os.config.json` file. This file allows you to configure the specific checks and evidence to be generated for your repository. For example, you can specify the paths to your test results and code coverage reports.

```json
{
  "evidence": {
    "testResults": "./artifacts/tests/junit.xml",
    "coverage": "./artifacts/coverage/lcov.info"
  }
}
```

## Step 4: Integrate into Your CI Pipeline

The `ga-os-compliance.yml` workflow is designed to run on every pull request and push to your main branch. You must ensure that it is a required check for merging pull requests.

This workflow will run the `evidence:verify` command to ensure that all required evidence is generated and meets the contract standards.

## Step 5: Perform a Dry Run

Before finalizing your integration, perform a dry run to ensure everything is working correctly.

1.  Run the `evidence:generate` command locally:
    ```bash
    pnpm evidence:generate
    ```
2.  Verify the output in the `artifacts/evidence/<commit>/` directory.
3.  Run the `ga:status` command:
    ```bash
    pnpm ga:status
    ```
4.  Check the contents of the generated `ga_status.json` file.

## Support

For questions or issues, please contact the **Platform Ops Captain** in the `#platform-ops` Slack channel.
