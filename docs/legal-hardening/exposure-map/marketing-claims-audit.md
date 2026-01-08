# Marketing Claims Audit

This document tracks public-facing claims and their verification status.
**Goal:** Eliminate "puffery" that creates warranty liability.

## Audit Log

| Claim / Statement           | Location            | Verification Artifact     | Status     | Action Required                                                        |
| :-------------------------- | :------------------ | :------------------------ | :--------- | :--------------------------------------------------------------------- |
| "Bank-grade security"       | Homepage / Footer   | N/A (Vague)               | **FAIL**   | Delete or Replace with specific standard (e.g., "AES-256 Encryption"). |
| "100% Uptime Guarantee"     | Pricing Page        | Historical SLA Report     | **RISK**   | Change to "99.9% SLA financially backed". "100%" is impossible.        |
| "GDPR Compliant"            | Features Page       | DPA, Privacy Policy, RoPA | **PASS**   | Ensure updated annually.                                               |
| "Military-grade encryption" | Security Whitepaper | N/A (Marketing term)      | **FAIL**   | Replace with "FIPS 140-2 Validated" (if true) or "Industry standard".  |
| "We never sell your data"   | Privacy Policy      | Data Inventory            | **PASS**   | Verified against `data-inventory.md`.                                  |
| "Real-time AI Analysis"     | Product Tour        | Latency Metrics (<200ms)  | **VERIFY** | Check `k6` load test results.                                          |

## Correction Protocol

1.  **Identify:** Scan website/docs for absolutes ("Always", "Never", "100%", "Perfect").
2.  **Verify:** Ask Engineering for proof (screenshot, log, config).
3.  **Remediate:** If no proof, rewrite copy to be accurate.
    - _Bad:_ "Unbreakable security."
    - _Good:_ "Security designed to SOC2 standards."
