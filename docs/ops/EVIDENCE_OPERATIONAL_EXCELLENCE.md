# Operational Excellence Evidence Pack

## 1. Overview

This pack demonstrates the operational maturity controls implemented in Sprint N+11. It covers alerting standards, incident response playbooks, automation, and safety mechanisms.

## 2. Artifacts

### 2.1 SLI/SLO & Alerting

- **Location:** `docs/ops/SLI_SLO_ALERTS.md`
- **Key Coverage:** API Latency, Availability, Agent Success Rate, Cost, Security.
- **Philosophy:** "Alert on symptoms, debug with cause."

### 2.2 Runbooks

- **Location:** `docs/ops/runbooks/`
- **Inventory:**
  - `INCIDENT_API.md`: Handling 5xx spikes and latency.
  - `INCIDENT_AGENT.md`: Stuck queues and zombie workers.
  - `INCIDENT_COST.md`: Runaway cloud spend or LLM usage.
  - `INCIDENT_SECURITY.md`: Auth attacks and policy denials.
  - `INCIDENT_DATA_INTEGRITY.md`: Corruption and backup restoration.

### 2.3 Incident Automation

- **Tooling:** `server/src/ops/incident/incident-manager.ts`
- **Capability:** Automatic snapshot of:
  - Environment Variables (Redacted)
  - Git Commit & Status
  - Process List
  - Memory Usage
- **Usage:**
  ```bash
  ./scripts/capture-incident-evidence.ts --incident-id INC-123
  ```

### 2.4 Change Freeze

- **Goal:** Instant safety valve during critical incidents.
- **Scripts:**
  - `enable-freeze.sh`: Creates lock file.
  - `check-freeze.sh`: Used by CI/CD to block deploys.
  - `disable-freeze.sh`: Restores normal operation.

## 3. Verification

Verified by `test/verification/ops.node.test.ts`.

Run verification:

```bash
npx tsx test/verification/ops.node.test.ts
```

## 4. Example Incident Flow

1.  **Alert:** PagerDuty pages for "API High Error Rate".
2.  **Ack:** Responder acknowledges page.
3.  **Contain:** Responder runs `./scripts/enable-freeze.sh`.
4.  **Diagnose:** Responder opens `docs/ops/runbooks/INCIDENT_API.md` and checks logs.
5.  **Mitigate:** Responder identifies bad config and rolls back.
6.  **Evidence:** Responder runs `./scripts/capture-incident-evidence.ts --incident-id INC-999`.
7.  **Review:** Responder creates Postmortem using `docs/ops/POSTMORTEM_TEMPLATE.md`.
