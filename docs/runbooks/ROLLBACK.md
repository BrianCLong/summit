# Rollback Procedure

## Automated Rollback
- If the automated deployment monitor detects failure (e.g., >5% error rate), it will auto-revert the deployment.
- Verify the auto-revert succeeded via CI/CD logs.

## Manual Rollback
1. Find the last known good commit on the `main` branch.
2. In GitHub UI or CLI, revert the bad merge commit.
   ```bash
   git revert -m 1 <bad_merge_commit_sha>
   ```
3. Push the revert branch and open a PR.
4. Obtain immediate approval from an on-call engineer.
5. Merge the PR to trigger a new deployment of the known good state.
6. Verify service health post-deployment.
