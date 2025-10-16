# Playbook: Policy Enforcement Rollout

This playbook outlines the steps to move from auditing policy to enforcing it in CI.

## 1. Shadow Mode (Default)

- The `policy-enforce.yml` workflow is disabled by default (`POLICY_ENFORCEMENT` variable is not `1`).
- The existing `quality.yml` workflow runs `opa test` and may run `opa exec` in a non-blocking way.
- **Goal:** Monitor policy decisions and build confidence in the rule set. Triage all reported violations as if they were blocking.

## 2. Enabling Enforcement

- **Prerequisite:** Shadow mode has run for at least one full sprint with zero unexpected violations.
- **Action:** A repository admin navigates to `Settings -> Secrets and variables -> Actions`.
- **Toggle:** Set the repository variable `POLICY_ENFORCEMENT` to `1`.

## 3. Enforcement Mode

- The `policy-enforce.yml` workflow will now run on all PRs.
- Any PR that results in a policy violation will be blocked from merging.
- **Goal:** Prevent policy violations from ever reaching the main branch.

## 4. Rollback

- To disable enforcement, simply delete the `POLICY_ENFORCEMENT` variable or set its value to `0`.
