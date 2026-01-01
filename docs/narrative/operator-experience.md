# Operator Experience: Calm Control

**Thesis:** Summit makes the Operator feel like a Pilot, not a passenger.

The goal of the Summit UX is **Cognitive Clarity**. In high-pressure situations, operators don't need "chatty" agents or raw JSON dumps. They need structured, actionable intelligence. We replace the "Wall of Fire" (endless red alerts) with a prioritized, explained Decision Queue.

---

## Day-in-the-Life: The SRE

### 09:00 - The Morning Brief
Instead of checking 15 dashboards, the SRE logs into Summit. The **System HUD** shows:
*   **System Health:** 99.99%
*   **Active Predictions:** 3 (e.g., "Disk fill in 4 days")
*   **Pending Decisions:** 2 (requiring approval)

### 10:15 - The Alert
An anomaly is detected in the Payment Gateway.
*   **Old Way:** PagerDuty triggers. SRE ssh's into boxes, greps logs, checks Slack. Chaos.
*   **Summit Way:**
    1.  Summit detects the anomaly.
    2.  Agent correlates it with a deployment 10 mins ago.
    3.  Agent proposes a **Rollback**.
    4.  SRE receives a notification: *"Payment Gateway Latency High. Cause: Deployment #123. Recommended Action: Rollback. [Approve] [Investigate]"*

### 10:17 - The Resolution
The SRE clicks **"Investigate"**.
*   Summit presents a "Context Card" showing the graph of the deployment and the latency spike.
*   The SRE confirms the correlation and clicks **"Approve"**.
*   Summit executes the rollback and posts the Evidence Record to the incident channel.

---

## UI Storyboards

### 1. The Decision Card
A standardized UI element for every proposed action.

*   **Header:** "Scale Service: `auth-worker`"
*   **Reasoning:** "Queue depth > 5000 for 5 mins. Policy `SLA-High` threatened."
*   **Risk:** 🟡 Medium (Cost impact)
*   **Visuals:** Sparkline of queue depth vs. threshold.
*   **Actions:** `[Approve]` `[Deny]` `[Edit Parameters]`

### 2. The Explanation Pane
No more "black box." Clicking "Why?" reveals the **Reasoning Trace**.
*   "I observed signal X."
*   "I checked Policy Y."
*   "I considered Options A, B, and C."
*   "Option A was chosen because it minimizes recovery time."

---

## Noise Suppression: "What You Never See"

Summit aggressively filters noise to protect operator attention.

*   **Flapping Alerts:** Suppressed by hysteresis policies.
*   **Known Issues:** Correlated with existing tickets; no new ping.
*   **Low-Priority Drifts:** Auto-remediated or batched for weekly review.

**The result:** When Summit pings you, you know it matters.
