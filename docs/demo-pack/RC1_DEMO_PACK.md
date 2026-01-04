# RC1 Demo Pack: IntelGraph v4.1.0-rc.1

**Release Candidate Tag:** `summit-2025.09.23.1710` (Simulated via v4.1.0-rc.1)

This pack contains everything needed to spin up a demo-safe environment of the IntelGraph platform and walk a prospective buyer through the core value proposition.

## 1. Quick Start (60-second Install)

**Prerequisites:** Docker Engine + Docker Compose

```bash
# Clone the repository (if not already done)
git clone https://github.com/intelgraph/platform.git
cd platform

# Start the demo stack
# This spins up API, Gateway, Neo4j, Postgres, Redis, and full Observability (Prometheus/Grafana)
docker compose -f docker-compose.demo.yml up -d

# Wait for health checks (approx 60s)
docker compose -f docker-compose.demo.yml ps
```

**Access Points:**
*   **Web Console:** `http://localhost:3000`
*   **API Gateway:** `http://localhost:4000`
*   **Grafana (Metrics):** `http://localhost:3001` (admin/admin123)
*   **Neo4j Browser:** `http://localhost:7474` (neo4j/demo123)

## 2. Demo Walkthrough Script (10 Minutes)

### Persona A: The Analyst (Investigation & Findings)

**Goal:** Show how IntelGraph accelerates "time-to-insight" while automatically capturing evidence.

1.  **Ingest (2 min):**
    *   Navigate to **Data Sources**.
    *   Upload the sample `suspicious_transactions.csv` (found in `examples/data/`).
    *   Show the "Entity Resolution" progress bar.
    *   *Talk Track:* "Notice how we don't just dump data; we resolve entities against the existing knowledge graph immediately."

2.  **Graph Exploration (3 min):**
    *   Go to the **Graph Explorer**.
    *   Search for "Entity X" (from the upload).
    *   Expand relationships (double-click node).
    *   Switch to **Timeline View** to see the temporal sequence of events.
    *   *Talk Track:* "We provide three synchronized views: Map, Graph, and Timeline. Context is preserved across all three."

3.  **Findings & Export (2 min):**
    *   Select a subgraph of interest.
    *   Click **"Add to Investigation"**.
    *   Navigate to **Reports**.
    *   Generate a "Standard Investigation Report" (PDF).
    *   *Talk Track:* "The report is cryptographically signed. You can hand this to a court or an auditor knowing the chain of custody is intact."

### Persona B: The Builder/Governance Officer (Control & Compliance)

**Goal:** Prove that the system is safe, auditable, and cost-controlled.

1.  **Policy Guardrails (1 min):**
    *   Attempt to access a "TS/SCI" tagged node as a standard user.
    *   Show the **Access Denied** toaster.
    *   Switch to **Admin > Policy Center**. Show the OPA (Open Policy Agent) Rego file enforcing this.
    *   *Talk Track:* "Security is not an afterthought; it's policy-as-code baked into the query layer."

2.  **Audit Log (1 min):**
    *   Go to **Compliance > Audit Logs**.
    *   Show the entry for the "Access Denied" event just triggered.
    *   Show the "Immutable Ledger" status.

3.  **Cost & Usage (1 min):**
    *   Open **Grafana** (linked from Admin).
    *   Show the **"Token Usage & Budget"** dashboard.
    *   *Talk Track:* "We track every LLM token and API call. You can set hard caps per team or per project."

## 3. Known Limitations (RC1)
*   **Persistence:** This demo stack uses local docker volumes. `docker compose down -v` will wipe data.
*   **Email:** Email notifications are printed to stdout in this mode.
*   **Models:** Connects to mock LLM providers by default for cost safety. Set `OPENAI_API_KEY` in `.env` to enable real inference.
