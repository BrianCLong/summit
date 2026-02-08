# Public Safe Fields Eval

## Goal
Validate that public evidence payloads contain only allowlisted fields and no private URLs.

## Procedure
1. Run `tools/publish/public_evidence_publish.py` against generated evidence outputs.
2. Confirm the policy gate passes.

## Expected Result
Public evidence publish succeeds with no redaction violations.
