# Release & Rollback

## How to Cut a Release

Releases are automated via GitHub Actions when a tag is pushed or manually triggered.

1.  **Draft**: A draft release is created from Conventional Commits.
2.  **Publish**: When approved, the release is published.

## Rollback Procedure

If a release is bad:

1.  **Identify**: Check `release/provenance.json` of the bad build to find the previous stable commit.
2.  **Revert**:
    ```bash
    git revert <bad-commit-sha>
    git push origin main
    ```
3.  **Redeploy**: The revert will trigger a new deployment.

## Hotfix

1.  Branch from `main`: `git checkout -b hotfix/fix-issue`
2.  Fix and Commit: `fix: critical bug`
3.  PR and Merge.
4.  Tag: `v1.0.1` (Patch bump).
