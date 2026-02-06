# Required Checks Discovery (TODO)

## Purpose
Document the authoritative required check names enforced by branch protection so
GA verification stays aligned with enforcement.

## Discovery Steps (GitHub UI)
1. Open **Settings → Branches → Branch protection rules** for `main`.
2. Select the active rule.
3. Capture the **Require status checks to pass before merging** list.
4. Paste the exact check names into this file and into the GA verification map.

## API Fallback
1. Use the GitHub REST API:
   `GET /repos/{owner}/{repo}/branches/main/protection/required_status_checks`.
2. Record the `contexts` array values (exact strings).
3. Update this file and the GA verification map with those names.

## Temporary Gate Names (until discovered)
- `ci-verify`
- `ci-core`
- `ci-security`

## Rename Plan
- Replace temporary names with the authoritative check names.
- Update any CI gate documentation and verification maps referencing placeholders.
