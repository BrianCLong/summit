# Runtime Safety Gates

* **Why:** prevent unsafe tool use, require human sign‑off for high autonomy, produce tamper‑evident trails.
* **How:** OPA admission gate in runner sidecar; denies on policy breach; returns structured incident with `operation_token` for break‑glass.
* **Break‑glass:** reviewers POST signed JWT (OIDC RS256) to `/approve`; gate records approval in evidence and unblocks run.
* **Evidence:** claims log (URI), audit bundle signed (cosign/PKI); CI verifies both.

## Policy Logic

- **Tool Allowlist:** Only explicitly allowed tools (defined in `policy/opa/data.json`) can be executed.
- **Autonomy Level:** High autonomy (>= 3) requires a signed human approval token.
- **Evidence:** Requests must include a claims logging URI and indicate that audit bundles will be signed.

## Simulator Tests

The `tests/agent_simulator` suite verifies these gates by:
1. Attempting safe runs (autonomy 2).
2. Attempting high-autonomy runs (autonomy 3) and verifying rejection (403).
3. Performing a break-glass approval flow with a signed JWT.
4. Verifying the resulting audit bundle signature and structure.
