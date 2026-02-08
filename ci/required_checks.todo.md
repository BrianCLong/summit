# Required Checks Discovery

**Status:** ✅ COMPLETED (2026-02-06)

## Current Branch Protection Configuration

The following required status checks are configured on the `main` branch:

| Check Name | App ID | Status |
|------------|--------|--------|
| Config Preflight | 15368 | ✅ Active |
| Build & Package | 15368 | ✅ Active |
| Verification Suite | 15368 | ✅ Active |
| Governance Checks | 15368 | ✅ Active |
| Schema Validation | 15368 | ✅ Active |

## Discovery Method

Retrieved via GitHub API:
```bash
gh api repos/:owner/:repo/branches/main/protection/required_status_checks
```

## Configuration Details

- **Strict mode:** Enabled (requires branches to be up to date before merging)
- **App ID 15368:** GitHub Actions workflow integration

## Related Files

- `.github/workflows/ci-core.yml` - Core CI pipeline
- `.github/workflows/pr-gates.yml` - PR gate checks
- `.github/workflows/server-typecheck.yml` - TypeScript validation
- `.github/workflows/verify-claims.yml` - Claim verification

## Future Considerations

If additional checks need to be added:
1. Create the workflow job in the appropriate workflow file
2. Ensure the job name matches exactly what will be required
3. Update branch protection via GitHub UI or API
4. Document in this file
