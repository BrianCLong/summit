# Promotion Guard v2 Runbook

## Overview
Promotion Guard v2 is the definitive gatekeeper for promoting releases from RC (Release Candidate) to GA (General Availability). It enforces a policy-driven approach, validating that all required evidence, testing shards, and resilience verifications are present and correct.

## Usage

### Basic Verification
To verify a release candidate against the GA policy:

```bash
pnpm promotion:verify --channel ga --evidence-dir dist/evidence
```

### Options
- `--channel <rc|ga>`: The target channel for promotion.
- `--evidence-dir <path>`: Path to the evidence pack (default: `dist/evidence`).
- `--offline`: Disable all network calls (relies strictly on downloaded evidence).
- `--ci-fetch`: (Optional) Allow fetching status from CI if evidence is missing (requires network).

## Interpreting Output

The tool outputs a JSON object to stdout.

### Example ALLOW
```json
{
  "decision": "ALLOW",
  "reasons": [],
  "evidence": { ... },
  "policy": { ... }
}
```

### Example DENY
```json
{
  "decision": "DENY",
  "reasons": [
    {
      "code": "MISSING_ATTESTATIONS",
      "message": "Attestations artifact missing from manifest"
    }
  ]
}
```

### Reason Codes
- `POLICY_MISSING`: The `release-policy.yml` file could not be found.
- `EVIDENCE_Integrity`: checksums in the manifest do not match the files on disk.
- `MISSING_ATTESTATIONS`: Required attestation artifacts are missing.
- `MISSING_DR_EVIDENCE`: Disaster Recovery drill reports are missing.
- `SHARD_FAILURE`: A required CI shard (e.g., `build`, `test`) failed.

## Remediation

1. **Missing Evidence**: Ensure the build pipeline completed successfully and `generate_evidence_bundle` was run.
2. **Shard Failure**: Check the CI logs for the failed shard, fix the issue, and rebuild.
3. **Drill Failure**: If a DR drill failed, a new drill must be conducted and a passing report generated.
4. **Policy Violation**: Ensure you are promoting from a allowed branch (e.g., `release/v*` for GA).

## Emergency Bypass
If the guard is blocking a critical hotfix and the risk is accepted, the gate can be bypassed in the CI workflow by setting `PROMOTION_GUARD_ENFORCE: "false"` (if available) or by manual override if authorized. All bypasses are logged.
