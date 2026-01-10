# Operational Waivers

**Approver:** @ciso / @cto
**Expiry:** 2026-01-01

| ID | Risk | Mitigation | Expiry | Status |
| :--- | :--- | :--- | :--- | :--- |
| **W-001** | Cross-Region active-active sync lag > 1s | App handles eventual consistency via optimistic locking. | 2026-Q1 | Active |
| **W-002** | Legacy ingestion endpoint still active | Protected by WAF and strict rate limits; deprecated. | 2025-12-31 | Active |
| **W-003** | Missing PII masking in debug logs (staging only) | Logs retained for 3 days only; access restricted to lead devs. | 2025-11-30 | Active |
