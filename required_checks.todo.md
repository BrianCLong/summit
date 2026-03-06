# Required Checks Discovery (Temporary)

## Discover branch protection required checks

1. Open GitHub repository settings.
2. Navigate to **Settings → Branches → Branch protection rules**.
3. Select the active rule for the target branch.
4. Record all check names under **Require status checks to pass before merging**.

CLI alternative:

```bash
gh api repos/:owner/:repo/branches/:branch/protection
```

## Temporary check names in this branch

- `ci-verify / verify`

## Rename plan

After canonical names are discovered, update `.github/workflows/ci-verify.yml` `name`/job labels to exact required-check strings and refresh this file.
