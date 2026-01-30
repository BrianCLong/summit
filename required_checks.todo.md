# Required Checks Discovery (Dynamic Intent)

## Summit Readiness Anchor

Reference: docs/SUMMIT_READINESS_ASSERTION.md (use this as the governing readiness baseline).

## UI (GitHub)

1. Repo Settings → Branches → Branch protection rules.
2. Select the default branch rule.
3. Record the exact required status checks (names are authoritative).
4. Capture any required pull request review settings tied to checks.
5. Export the list into this file and replace the temporary names below.

## API (GitHub REST)

- Endpoint: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
- Additional: GET /repos/{owner}/{repo}/branches/{branch}/protection
- Persist the `contexts` array verbatim in this file.

## API (GitHub GraphQL)

- Query `branchProtectionRules` and record `requiredStatusCheckContexts`.
- Store the results in `required_checks.todo.md` and reconcile with REST output.

## Temporary CI gate names (rename after discovery)

- ci/schema-validate
- ci/determinism
- ci/deny-by-default
- ci/deps-delta
- ci/locality-gate

## Rename plan (authoritative naming)

1. Replace temporary names with the exact required contexts from GitHub.
2. Add a mapping table `{temporary → required}` for traceability.
3. Update any CI configuration to use the authoritative names.
