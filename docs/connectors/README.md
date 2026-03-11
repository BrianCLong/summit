# Connectors

This directory documents connector lanes used by Summit's Switchboard ingestion wedge.

## Demo-ready Connectors

- **MIT Sloan Startup Signals**: `datasets/wow/mit-sloan-startups-2026.jsonl`
- **Threat Horizon Intel Summary**: `datasets/wow/intsum-2026-threat-horizon.jsonl`

## Typical Flow

1. Source payload enters connector lane.
2. Connector maps records to canonical entities/relations.
3. Debezium emits lineage events.
4. Semantic chunking enriches graph evidence.

## Run the Zero-Config Demo

```bash
pnpm demo:company
```

The demo script emits:

- HTML report: `artifacts/wow-demo/report.html`
- Optional PDF report: `artifacts/wow-demo/report.pdf`
- GraphQL mutation: `artifacts/wow-demo/graphql-run-agent-swarm.graphql`
