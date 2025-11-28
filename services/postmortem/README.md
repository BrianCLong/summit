# Auto-Postmortem & Continuous Improvement Engine (Prompt #72)

- **Feature flag:** `APCI_ENABLED` (default: false)
- **Flow:** Generate→Edit→Publish with dual-control; incident heatmaps; regression guardrails; jQuery quick-insert
- **Integrations:** open repo issues; notify via NHAI (#53); track DORA-like metrics; redact sensitive data
- **Templates:** ops incident + analytic miss; corrective action SLA default 30 days; urgent <7 days
- **Tests:** golden postmortem fixtures; timeline accuracy; Playwright generate→approve→track actions
