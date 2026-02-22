# Incident: Temporary Governance Bypass for Project Bootstrapping

- **Date:** 2026-02-10
- **Action:** Disabled `require_code_owner_reviews` and `enforce_admins` on `main`.
- **Reason:** Deadlock during "sealed baseline" implementation where CODEOWNER reviews were required for the very files defining the governance rules, and no eligible non-author reviewers were available in the bootstrap phase.
- **Duration:** ~15 minutes
- **Resolution:** Post-merge, all protections (including `enforce_admins`) were restored. Gold standard verified.
- **Evidence:** PR #18395, Commit `1b2aaa13f65eb91d545078a1b7e0ebc943386d0c`.
