# Required Checks Discovery (TODO)

## Goal

Identify exact branch protection required-check names for `main`.

## Steps (UI)

1. Repo → Settings → Branches → Branch protection rules → `main`.
2. Copy the **exact** check names listed under “Require status checks to pass”.

## Steps (API)

1. Use GitHub REST:
   - GET /repos/{owner}/{repo}/branches/main/protection
2. Extract required_status_checks.contexts

## Temporary Gate Naming Convention

- subsumption-bundle-verify (temporary)
- expectation-baseline-evals (temporary)

## Rename Plan

If actual required check names differ, add a PR that:

- updates workflow job names to match exact contexts
- updates docs + manifest required checks list
