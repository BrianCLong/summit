# Required checks discovery (temporary)

## UI (recommended)
1. GitHub repo → Settings → Branches → Branch protection rules.
2. Open rule for `main`.
3. Copy “Required status checks” list into this file.

## API (alt)
- Use GitHub REST: Get branch protection for `main` and list required checks.

## Temporary naming convention
Until confirmed, treat required checks as:
- ci-core
- ci-pr
- ci-security
- ci-verify

## Rename plan
When actual check names are known, update:
- `.github/workflows/*.yml` (names)
- branch protection rules
- this file (close out)
