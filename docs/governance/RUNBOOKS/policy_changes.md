# Policy Change Runbook

**Trigger:** Need to modify a governance policy (e.g., `POLICIES.md`, Gate thresholds).

## Process
1.  **Draft:** Create a PR with the policy change.
2.  **Validate:** Ensure `governance-policy-validation` job passes.
3.  **Review:**
    *   **Security:** Must approve.
    *   **Legal:** Must approve (if applicable).
    *   **Governance Board:** Final sign-off.
4.  **Announce:** Broadcast the change to `dev-all` 24h before merge.
5.  **Merge:** Merge to `main`.

## Verification
*   Check that the Policy Version in `policy_version.txt` is incremented.
*   Verify that `make ga` uses the new policy parameters.
