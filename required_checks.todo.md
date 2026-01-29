# Required Checks Discovery

1. Go to GitHub UI -> Settings -> Branches -> Required status checks.
2. Run this query to list checks:
   ```bash
   gh api repos/:owner/:repo/commits/HEAD/check-runs --jq '.check_runs[].name'
   ```
3. Update CI config to include discovered check names.
4. Temporarily, ensure `ci/verify_evidence.py` passes.
