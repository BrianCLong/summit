# Operator Command Center Guide

Welcome to the IntelGraph Operator Command Center Guide. This document is designed to equip new operators on their first on-call shift with all necessary context to operate the system, read dashboards, run validation scripts, and escalate incidents without relying on tribal knowledge.

## 1. Operator Command Center Overview

The Command Center consists of three main toolchains:

- **Observability Stack (Grafana & Prometheus)**: Real-time telemetry, golden signals, and alerting. Located at `https://grafana.intelgraph.com`. Source code in `infra/observability/`.
- **Validation & Health Scripts**: Bash and Node.js scripts to proactively and reactively test system health. Located in `scripts/`.
- **Evidence Verification**: Tooling to ensure deployments meet our governance and reliability contracts. Located in `scripts/ci/` and `tools/ci/`.

As an operator, your primary workflow during an incident or release is to:
1. Observe the **Dashboards**.
2. Run **Health Checks**.
3. Execute **Validation Scripts**.
4. Verify **Evidence Artifacts** post-deployment.
5. Follow the **Incident Response Quick-Start** if issues are detected.

---

## 2. Dashboard Usage Guide

Grafana provides several dashboards for monitoring system health. Access them at `https://grafana.intelgraph.com`.

### API Golden Signals
- **URL**: `https://grafana.intelgraph.com/d/intelgraph-api-golden`
- **How to read**: Focus on the Four Golden Signals:
  - **Traffic**: Requests per second. Sudden drops indicate ingress failure.
  - **Latency**: P95 and P99 response times. Spikes indicate database contention or CPU starvation.
  - **Errors**: HTTP 5xx rates. Sustained >1% requires immediate investigation.
  - **Saturation**: Memory/CPU usage relative to limits.
- **What matters**: Consistent baseline. An alert fires when error budget burns or 5xx rates exceed SLO.

### Worker Golden Signals
- **URL**: `https://grafana.intelgraph.com/d/intelgraph-worker-golden`
- **How to read**: Monitor job processing rates, queue depth, and worker error rates.
- **What matters**: Queue depth growth without matching processing throughput indicates worker starvation or crashing jobs.

### Infrastructure Overview
- **URL**: `https://grafana.intelgraph.com/d/kubernetes-overview`
- **How to read**: Kubernetes cluster health, node resource utilization, and pod crash loop states.
- **What matters**: Evicted pods, OOMKilled containers, and node disk pressure.

---

## 3. Health Check Execution

Health check scripts proactively poll endpoints, databases, and caches to verify subsystem readiness.

### Running the Core Health Check
Execute the main health check script from the repository root:
```bash
./scripts/health-check.sh
```

**What it does:**
- Polls primary HTTP endpoints (expected HTTP 200).
- Tests PostgreSQL connectivity (`pg_isready`).
- Tests Redis connectivity (`redis-cli ping`).

### Interpreting Output
The script provides standard out success/fail indicators and returns an exit code.
- **Success**: Output shows `✅ All services are healthy!` and returns exit code `0`.
- **Failure**: Output shows `❌ Some services have issues. Check the logs` and returns exit code `1`.

For JSON-based health checks, you may also see output specifying granular component states:
```json
{
  "status": "healthy",
  "components": {
    "api": { "status": "up", "latency_ms": 45 },
    "database": { "status": "up", "connections": 12 },
    "redis": { "status": "up", "ping_ms": 2 }
  }
}
```
If `status` is anything other than `healthy`, escalate to L2 if the issue is not immediately resolvable via standard runbooks.

---

## 4. Evidence Artifact Verification

After a deployment, we must confirm that evidence contracts (e.g., test coverage, policy compliance, security scans) are satisfied. These are stored as JSON artifacts (like `report.json`, `index.json`, `stamp.json`).

### How to verify
Run the evidence validation wrapper script:
```bash
./scripts/ci/evidence-validate.sh <path_to_bundle_dir>
```

**Expected behavior:**
- The script checks that the evidence JSON conforms to strict schemas (`summit/evidence/schemas/`).
- It ensures timestamps are correctly placed only in `stamp.json`.
- A successful validation returns exit code `0`. Any failure means the deployment violated governance policies and must be reviewed or rolled back immediately.

---

## 5. Validation Script Reference

Below is a quick-reference table of common validation and post-deployment scripts located in the `scripts/` directory.

| Script | Purpose | Usage Example |
|---|---|---|
| `scripts/post-deployment-validation.sh` | Comprehensive post-deploy validation suite. | `./scripts/post-deployment-validation.sh <namespace> <api_url>` |
| `scripts/ops_validate.mjs` | Validates operational tooling (Helm, Terraform syntax). | `node scripts/ops_validate.mjs` |
| `scripts/health-check.js` | Node.js based HTTP health probe. | `node scripts/health-check.js https://api.mc-platform.com` |
| `scripts/ci/evidence-validate.sh` | Validates CI/CD evidence bundles. | `./scripts/ci/evidence-validate.sh path/to/evidence/` |
| `scripts/ci/validate-workflow-filters.sh` | Validates GitHub Actions workflow paths. | `./scripts/ci/validate-workflow-filters.sh` |

Run these scripts post-deployment to guarantee system coherence before declaring a release successful.

---

## 6. Incident Response Quick-Start

If an alert fires, take these 5 immediate actions:

1. **Acknowledge the Alert**: Claim the incident in PagerDuty/Slack to signal you are investigating.
2. **Check the Dashboards**: Open the **API Golden Signals** and **Infrastructure Overview** to determine the blast radius (is it affecting all traffic, or just a specific worker?).
3. **Run Health Checks**: Execute `./scripts/health-check.sh` to see if basic connectivity to Postgres/Redis is intact.
4. **Isolate the Failure Domain**: Check the logs of the failing component using Grafana Loki or Kubernetes (`kubectl logs -n mc-platform <pod_name>`).
5. **Mitigate or Escalate**: If the issue is a known runbook scenario (e.g., pod crashloop, database lock), follow the runbook to mitigate. If it is novel, immediately escalate to L2 support.

---

## 7. Escalation Matrix

When an issue cannot be resolved using standard procedures within 15 minutes, follow this escalation path:

| Level | Who to Contact | Responsibilities | When to Escalate |
|---|---|---|---|
| **L1 (You)** | On-Call Operator | Acknowledge tickets, collect logs, run basic validations. | Initial alert triage. |
| **L2** | SRE / Platform Team | Investigate complex issues, apply workarounds, engage engineering. | Issue unresolved after 15 mins, or requires infrastructure changes. |
| **L3** | Core Engineering | Deep engineering analysis, provide hotfixes/patches, coordinate emergency releases. | Code-level bugs, major data corruption, or total system failure. |

If you are ever in doubt, over-communicate and escalate early.
