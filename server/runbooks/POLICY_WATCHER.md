# Policy Watcher Control Runbook

## Purpose

Policy Watcher detects drift between the repository source-of-truth Rego policies (`server/policies/*.rego`) and the policies currently loaded in the live OPA instance. The control provides compliance evidence for change-control and helps operations staff react quickly to policy tampering or missed deployments.

## How to Run

1. Ensure OPA is reachable (default: `http://localhost:8181` or override with `OPA_URL`).
2. From the repository root, execute:
   ```bash
   node server/scripts/policy-watcher.js
   ```
3. Review output:
   - `Policy watcher summary` shows total policies scanned, drifted counts, and unreachable policies.
   - `OPA policy drift detected` entries include local and remote hashes for diff investigation.
   - `OPA policy not reachable during drift check` signals connectivity issues; rerun after restoring access.

## Expected Outcomes

- **No drift**: Exit code `0`; no further action required.
- **Drift detected**: Exit code `1`; create an incident ticket, reconcile the policy (redeploy bundle or revert repository change), and capture evidence of remediation.
- **Unreachable OPA**: Exit code remains `0`, but warnings are emitted. Treat as a monitoring alert and restore connectivity before assuming policies are synchronized.

## Evidence Collection

- Attach the watcher console output to the change record.
- Capture the `Policy watcher summary` log line with timestamps.
- When drift occurs, include the local/remote hash pair in the incident notes.

## Escalation

- Security engineering owns policy integrity. Escalate drift incidents to the on-call security engineer and SRE.
- For persistent connectivity failures, page the platform SRE rotation.

## Related Controls

- OPA policy unit tests (`server/policies/tests/*`) should be run in CI via `opa test server/policies`.
- GraphQL mutation authorization is enforced via `wrapResolversWithPolicy` and the mutation role matrix defined in `server/src/resolvers/authzGuard.ts`.
