# Summit Dependency Maintenance Guide

This guide explains how dependency automation is configured for the Summit repository and how engineers should review or extend it.

## Automation Overview

Summit relies on two complementary dependency updaters:

- **Dependabot** monitors the main JavaScript (`package.json`), Python (`requirements.in`), and Helm (`helm/*/Chart.yaml`) entry points and opens weekly pull requests with the `dependencies` label. Configuration lives in `.github/dependabot.yml`.
- **Renovate** provides fine-grained control over update cadence and grouping. Its behaviour is defined in `.github/renovate.json` and supplements Dependabot by automatically merging safe patch releases and labelling high-risk changes.

> **Tip:** Either bot may be temporarily paused by setting `automerge` to `false` in the relevant configuration section or via repository settings if there is an ongoing incident.

## Pull Request Policy

1. **Low-risk updates** (SemVer patch releases) are auto-merged when status checks succeed.
   - Dependabot patch PRs are marked for auto-merge by `.github/workflows/dependabot-auto-merge.yml` once the metadata confirms a patch bump.
   - Renovate patch PRs auto-merge via package rules that enable `platformAutomerge` and add the `automerge:patch` label.
2. **Major version changes** are flagged with `major-update` and `manual-review` labels. These require human approval and should be validated against breaking-change notes from upstream projects.
3. **Security advisories** raised by Dependabot or Renovate’s vulnerability alerts auto-merge immediately after checks succeed to reduce exposure time.

If CI fails, the bot pauses auto-merge and waits for maintainers to push fixes or close the PR.

## Continuous Integration Checks

The `Dependency Update Validation` workflow runs whenever a dependency PR touches the relevant files:

- **Node.js**: Installs dependencies with `npm ci` (Node 20) and runs `npm test -- --runInBand` for the Jest suite.
- **Python**: Creates a Python 3.11 environment, installs from `requirements.in`, and executes `pytest python/tests -q`.
- **Helm**: Detects changed charts, runs `helm dependency build`, and executes `helm lint`.
- **Security**: Executes a Trivy filesystem scan focused on HIGH/CRITICAL vulnerabilities.

These jobs surface issues early and gate auto-merges via required status checks.

## Operational Runbook

- **Adjusting schedules**: Update the `schedule.interval` fields in `.github/dependabot.yml` or the `schedule` array in `.github/renovate.json`.
- **Adding packages or ecosystems**: Extend the appropriate configuration with new directories (Dependabot) or manager types/package rules (Renovate). Keep labels consistent so workflow filters continue to operate.
- **Temporarily disabling automation**: Set `ignore: ["*"]` for the ecosystem in Dependabot or `enabled: false` in a Renovate package rule, then revert once ready.
- **Handling complex upgrades**: Convert auto-merged patch rules to manual review by toggling `automerge` to `false` and adding a group-specific package rule.
- **Responding to failing CI**: Push fixes to the bot branch or close the PR and track the issue in the dependency dashboard (Renovate’s dashboard link is in the PR description).

Keeping the bot configurations in sync with platform changes ensures dependency debt stays manageable while preserving release safety.
