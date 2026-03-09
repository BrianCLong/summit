# Hotfix Procedure

When a critical bug is found in production and a full release cycle is too slow:

1. **Branching:** Create a branch `hotfix/<issue-name>` off the current production release tag.
2. **Fix:** Implement the minimal necessary change to fix the issue. Avoid refactoring.
3. **Test:** Add a targeted test to prevent regression.
4. **Review:** Require 1 explicit approval from a code owner.
5. **Deploy:** Merge the hotfix branch. CI/CD will automatically deploy the hotfix tag to production.
6. **Backport:** Ensure the fix is cherry-picked or merged back into the `main` branch so future releases contain the fix.
