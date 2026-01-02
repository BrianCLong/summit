# SOC 2 Control Mapping

## Overview
This document maps Summit/IntelGraph technical controls to SOC 2 Criteria (Security, Availability, Confidentiality).

## Control Mapping

| SOC 2 Criteria | Control ID | Description | Implementation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CC1.1** | GOV-01 | Board of Directors Oversight | Governance Committee (AGENTS.md) | Enforced |
| **CC2.1** | COM-01 | Internal Communication | Slack/Jira/GitHub | Enforced |
| **CC6.1** | SEC-01 | Logical Access Security | OPA Policies + OIDC | Enforced |
| **CC6.6** | SEC-02 | Boundary Protection | WAF + Network Policies | Enforced |
| **CC7.1** | OPS-01 | System Monitoring | Prometheus/Grafana | Enforced |
| **CC8.1** | DEV-01 | Change Management | PR Normalization + CI Gates | Enforced |

## Evidence
- **Access Control**: `policy/opa/`
- **Change Management**: `PR_NORMALIZATION_CHECKLIST.md`, `.github/workflows/`
- **Monitoring**: `monitoring/alerts.yaml`
