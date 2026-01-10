# MVP-4 GA Demo Narrative

**Goal:** Demonstrate the **Supported** capabilities of Summit MVP-4 while strictly avoiding Beta/Insecure paths.

**Audience:** Customers, Auditors, Executives.
**Time:** 15 Minutes.

---

## 1. Login & Identity (The "Front Door")

*   **Narrative:** "Summit enforces strict Zero Trust access from the very first interaction."
*   **Action:** Log in via the **Summit Web Console**.
*   **Behind the Scenes:**
    *   Traffic hits `sandbox-gateway`.
    *   **Verified:** JWT is cryptographically verified (No bypass).
    *   **Verified:** Tenant ID is securely extracted from the token.
*   **Do NOT Show:** Direct API calls to `humint-service` or `decision-api` (these would bypass auth or fail verification).

## 2. The Maestro Engine (Core Capability)

*   **Narrative:** "Orchestrate complex intelligence workflows with auditable precision."
*   **Action:** Create a simple "Data Ingestion" run in the Maestro Console.
*   **Behind the Scenes:**
    *   Request flows through Gateway -> Server.
    *   `x-tenant-id` header is injected *by the Gateway*, ensuring the user cannot spoof another tenant.
    *   Mutation is logged to Provenance Ledger.

## 3. Governance & Audit (The "Safety Net")

*   **Narrative:** "Every action is immutable and verifiable."
*   **Action:** Show the **Provenance Ledger** view.
*   **Highlight:** The record of the Maestro Run created in Step 2.
    *   Show the Actor ID, Timestamp, and Cryptographic Hash.
*   **Claim:** "This audit trail is tamper-evident."

## 4. Observability (Operational Readiness)

*   **Narrative:** "We maintain strict SLAs for performance and reliability."
*   **Action:** Show the **Grafana Dashboard**.
*   **Highlight:** "Golden Signals" (Latency, Error Rate) for the Gateway.

---

## 🚫 Restricted Paths (Do NOT Demo)

To maintain the integrity of the GA claim, **avoid** the following:

1.  **PsyOps / Humint Modules:** These are Beta and have visual indicators of "Unclassified/Dev" status that contradict the "Secure" narrative.
2.  **Marketplace:** The plugin installation flow is experimental.
3.  **Direct API Access:** Do not use `curl` to hit backend ports (4000/4010) directly; always go through the Console or Gateway URL.

---

## 5. Closing

*   **Narrative:** "Summit MVP-4 is ready for mission-critical deployment, backed by robust identity, governance, and observability."
