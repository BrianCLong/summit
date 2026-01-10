# ITD-OIP Embodiments

## Threat Story Builder

- Ingests SIEM, EDR, and cloud audit logs, aligning them into graph-based timelines with ATT&CK mappings and evidence pointers.
- Provides APIs for analysts to append annotations, mark false positives, and export narratives to case management.

## Sandbox Replay Engine

- Spins up isolated environments mirroring production topology to replay observed attack paths and measure control effectiveness.
- Captures replay metrics (dwell time, detection depth, blast radius) and updates risk scores accordingly.

## Governance Reporting

- Generates compliance-ready reports with cited evidence, control owners, and remediation deadlines.
- Publishes signed summaries to an audit ledger and sends structured alerts to stakeholders.
