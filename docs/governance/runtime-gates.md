---
Status: Active
Owner: Summit Security Team
Last-Reviewed: 2024-03-20
Evidence-IDs: ["EVD-2024-001"]
---

# Runtime Safety Gates

* **Why:** prevent unsafe tool use, require human sign‑off for high autonomy, produce tamper‑evident trails.
* **How:** OPA admission gate in runner sidecar; denies on policy breach; returns structured incident with `operation_token` for break‑glass.
* **Break‑glass:** reviewers POST signed JWT (OIDC RS256) to `/approve`; gate records approval in evidence and unblocks run.
* **Evidence:** claims log (URI), audit bundle signed (cosign/PKI); CI verifies both.
