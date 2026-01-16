# Portfolio Enforcement Progression Ladder

This document defines the maturity ladder for adopting the federated GA Operating System. The goal is to provide a clear, incremental path for teams to onboard, moving from basic visibility to full, automated enforcement. The `summit-ga-os doctor` command will be used to report a repository's current level.

## Level 0: Visibility

**Goal**: Establish a baseline of portfolio-wide awareness without requiring any changes to the repository's CI/CD process.

**Requirements**:
- The repository is listed in the central `PORTFOLIO_TOPOLOGY.md`.
- A Product Release Captain and Repo Maintainer are assigned.

**Enforcement**: None. This is a manual, documentation-based step.

## Level 1: Contract Compliance (Warn Mode)

**Goal**: Implement the GA OS Contract in a non-blocking "warn" mode.

**Requirements**:
- The `@summit/ga-os` package is installed.
- The `init` command has been run, creating the `.ga-os.config.json` and `ga-os-compliance.yml` workflow.
- The standard commands (`evidence:generate`, `evidence:verify`, `ga:status`) are present in `package.json`.
- The `ga-os-compliance.yml` workflow runs successfully.

**Enforcement**: The `ga-os-compliance.yml` workflow runs but is not a *required* check for merging PRs. Failures will be visible in the logs and on the Portfolio Dashboard, but will not block development.

## Level 2: Drift Guard for Claim Surfaces

**Goal**: For repositories with public-facing documentation or "claim surfaces," ensure that all claims are backed by evidence.

**Requirements**:
- The repository has a `claim-ledger.json` file.
- The `ga:status` command includes a check to validate that all claims in the ledger have corresponding evidence.

**Enforcement**: The `ga-os-compliance.yml` workflow includes a "Drift Guard" step that will fail if claims are made without evidence. This check is still in "warn" mode.

## Level 3: Evidence Verification for Release Candidates

**Goal**: Gate the creation of release candidates (`rc-*` tags) on the successful verification of all required evidence.

**Requirements**:
- The repository has a release workflow that creates release candidates.
- This workflow is modified to run the `evidence:verify` command.

**Enforcement**: The release workflow will fail and block the creation of a release candidate if `evidence:verify` does not exit successfully.

## Level 4: Full GA Gate

**Goal**: Make the GA OS compliance workflow a mandatory gate for all product GA releases.

**Requirements**:
- The `ga-os-compliance.yml` workflow is configured as a **required status check** in the repository's branch protection rules for the main branch.

**Enforcement**: Pull requests cannot be merged to the main branch unless the `ga-os-compliance.yml` workflow succeeds. This is the final state for all mature, GA-ready products in the portfolio.
