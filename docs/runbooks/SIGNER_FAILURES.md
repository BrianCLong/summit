# Signer Failure Runbook

**Trigger:**
* `SignerFailure` alert (> 0.1% failure rate)

**Impact:**
* Evidence Ledger integrity at risk.
* Compliance violations if audit trail is broken.

**Immediate Actions:**
1. **Check Logs:** Search for `SignerError` or `HSMConnectionError` in logs.
2. **Fail-Closed Policy:**
   * **Do NOT** disable signing. The system must fail-closed to preserve audit integrity.
3. **Queue Park:**
   * If transient, the queue should retry.
   * If persistent, park the queue to prevent DLQ flooding: `summitctl queue park ledger-writes`
4. **Rotate Keys (If Compromised/Corrupted):**
   * Follow `docs/security/KEY_ROTATION.md`.
5. **Replay:**
   * Once fixed, replay parked messages: `summitctl queue replay ledger-writes`

**Escalation:**
* Page Security Engineer immediately if HSM is unreachable.
