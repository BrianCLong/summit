---
name: security-boundary-check
description: Threat-model and validate changes that touch auth/permissions/network/policy.
---
When to use:
- Files under auth, policy, permissions, identity, secrets, network edges.

Do:
- Identify assets, trust boundaries, entrypoints
- List abuse cases + mitigations
- Ensure policy enforcement points are tested
- Require explicit sign-off checklist in PR
