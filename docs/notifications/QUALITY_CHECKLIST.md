# Alert Quality & Justification Checklist

Before creating a new alert or notification type, run through this checklist. If you cannot answer "Yes" to the mandatory questions, the alert should probably be a dashboard metric or a log entry instead.

## 🛑 Mandatory Checks (The "Must Haves")

1.  **Is it Actionable?**
    *   [ ] Yes. The recipient knows exactly what to do (e.g., "Restart service", "Approve request", "Investigate user").
    *   *If No: It's just noise. Don't send it.*

2.  **Is the Audience Correct?**
    *   [ ] Yes. It goes to the specific person/team empowered to fix it.
    *   *If No: Fix routing logic. Broadcasting to "everyone" is forbidden.*

3.  **Is Urgency defined correctly?**
    *   [ ] Yes. If it's "CRITICAL", it means "Drop everything now". If it can wait until morning, it is "LOW" or "INFO".

4.  **Does a Runbook exist?**
    *   [ ] Yes. The alert includes a link to documentation explaining how to triage/fix the issue.

## ⚠️ Quality Indicators (The "Should Haves")

5.  **Is it Deduplicated?**
    *   [ ] Yes. If the trigger fires 100 times in a minute, I only get 1 notification.

6.  **Is it Signal, not Noise?**
    *   [ ] Yes. I have verified that this alert does not "flap" (turn on/off rapidly) under normal operating conditions.

7.  **Is there a Self-Healing path?**
    *   [ ] Yes/No. Can the system fix itself first? (e.g., auto-restart) -> If so, alert only if self-healing fails.

## ♻️ Lifecycle Management

*   **Review Policy**: Every notification type must be reviewed quarterly.
*   **Deprecation**: If an alert has not fired in 6 months, verify if the condition is still possible. If it fires frequently but is always ignored, DELETE IT.
