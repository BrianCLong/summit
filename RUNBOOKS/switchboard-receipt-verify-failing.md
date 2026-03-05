# Runbook: Switchboard Receipt Verification Failing

## Trigger
- Receipt verification failure rate > 0.1%.
- Alert: `SwitchboardReceiptVerificationFailures`.

## Impact
Receipts may be rejected by auditors or downstream systems.

## Triage Steps
1. Confirm current signing key ID and notary provider.
2. Validate receipt canonicalization hash inputs.
3. Check for clock skew between signing and verification services.

## Mitigations
- Rotate signing key and refresh verifier key cache.
- Re-emit receipts for impacted window with updated signatures.
- Synchronize time sources (NTP) for signer and verifier.

## Verification
- Receipt verification failures return to baseline.
- No invalid signatures in the last 30 minutes.
