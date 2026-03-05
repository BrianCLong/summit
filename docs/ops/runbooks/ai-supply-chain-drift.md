# AI Supply Chain Firewall Drift Monitoring Runbook

## Overview
This runbook covers the monitoring of AI-recommended dependency trends to detect potential systemic supply chain drift.

## Metrics Monitored
* Hashed dependency names frequency over time.
* "New dependency spike" metrics.
* Policy bypass/waiver rates.
* Cross-repo recurrence inside the Summit organization.

## Drift Reports
Outputs are deterministically generated:
* `evidence/ai-supply-chain-firewall/drift_report.json`
* `evidence/ai-supply-chain-firewall/trends.json`
