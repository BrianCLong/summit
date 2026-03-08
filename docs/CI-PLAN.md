# CI Plan

This document captures the proposed consolidation of Summit CI into three clear lanes plus merge-train support. It is intended to be the source of truth for near-term CI refactors and required checks.

## Overview

- **Fast lane (PR protection)**: A single workflow (planned name: `ci-lint-and-unit.yml`) that runs on `pull_request` and `push` to `main`. It installs with pnpm on Node 20, caches dependencies, and runs type-check, lint, and unit tests only. This replaces legacy fast-path workflows once landed.
- **Golden path (integration)**: A workflow (`ci-golden-path.yml`) that mirrors the developer golden path: `make bootstrap`, `make up`, `make smoke`, with health checks and artifacted docker logs. It runs on `push` to `main`, manual dispatch, and nightly schedule.
- **Security lane**: A consolidated security workflow (`security.yml` or equivalent) covering SCA and secret scanning. Runs on `push` to `main` and a weekly schedule. Existing overlapping security workflows will be retired or routed through this job.

## Required checks for branch protection

Set the following jobs as required on `main` once the workflows are in place:

- `ci-lint-and-unit / lint-and-unit`
- `ci-golden-path / golden-path`
- `security / security-scan`

Job names will be kept stable to avoid frequent branch protection updates.

## Merge-train and auto-update strategy

- Keep the existing **“Auto Update PRs (safe)”** workflow to rebase/merge `main` into open PRs; prefer updates via labels instead of blanket rebases.
- Define a label such as `automerge-safe` or `merge-train` to opt PRs into automated sequencing.
- A lightweight train runner should iterate through labelled PRs, update from `main`, wait for the required checks above, and auto-merge when clean. The train stops on the first failure to keep `main` green.
- Exclude PRs with conflict markers or “danger” labels (`do-not-merge`, `wip`, `needs-design`).

## Cleanup scope

- Deprecate or delete legacy fast lanes that duplicate lint/type/test (e.g., `ci.yml`, `ci.main.yml`, `ci-main.yml`, `dev-ci.yml`, `lane-fast.yml`) after the new fast lane is validated.
- Keep golden-path variants (`golden-path-ci.yml`, `ci-golden-path.yml`, `golden-pr-tests.yml`) but route them through the new canonical `ci-golden-path.yml` to avoid drift.
- Consolidate security workflows into one canonical file; stub superseded workflows with comments pointing to the new location if immediate deletion is risky.

## Documentation and onboarding

- Update README with a concise CI & merge policy section (required checks, golden-path enforcement on `main`, and the auto-merge label policy).
- Maintain a runbook (`runbooks/CI.md`) describing workflows, debugging tips, and local pre-flight commands (`./start.sh` or `make bootstrap && make up && make smoke`).
- Keep workflow names and job names human-readable and consistent with the required-checks list above.
