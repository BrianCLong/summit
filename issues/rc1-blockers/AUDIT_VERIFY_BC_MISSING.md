# RC1 Blocker: Audit Logging Verification Failed (Missing tool)

## Description
`scripts/audit-verify.sh` fails because the `bc` command is not installed in the environment.

## Impact
Prevents verification of audit trail integrity.

## Suggested Fix
Install `bc` in the base image or runner environment.
