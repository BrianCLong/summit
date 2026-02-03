# Summit Assessment Framework

This module implements a security assessment framework inspired by AutoPentestX, but adapted for Summit's governance and evidence requirements.

## Policy: Deny-by-Default

By default, all live scanning capabilities are **disabled**.

To perform a live assessment (i.e., sending packets to targets), you must strictly adhere to the following policy:

1.  **Allowlist**: You must populate `security/targets.allowlist.json` with the specific targets (CIDRs, domains) you are authorized to assess.
2.  **Attestation**: You must create `security/authorization.attestation.md` signing off on the authorization, scope, and timeframe.
3.  **Live Flag**: You must explicitly pass `live=True` (or `--live` in CLI) to the runner.

If any of these conditions are not met, the framework will raise a `PolicyError` and refuse to run.

## Usage

(Coming soon: CLI usage instructions)
