# Agent Capability Graph Data Handling

## Data classes
- **public:** graph schema docs, normalized sample graph
- **internal:** real agent IDs, policy mappings, budget thresholds
- **restricted:** tokens, secrets, private repo paths, customer data, deployment credentials

## Never log
- API keys / tokens
- raw secrets
- private customer content
- full prompt bodies containing confidential context
- deployment credentials
- security findings that disclose exploit details before remediation

## Retention
- **deterministic graph artifacts:** 30 days
- **drift reports:** 30 days
- **failure diagnostics:** 14 days
- *No retention for secrets because secrets must never be logged*
