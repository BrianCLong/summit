# Disaster Recovery Targets & Service Tiers

## Definitions
* **RTO (Recovery Time Objective):** Maximum acceptable time service is down.
* **RPO (Recovery Point Objective):** Maximum acceptable data loss duration.

## Targets by Tier

| Tier | Service | RTO | RPO | Description |
|------|---------|-----|-----|-------------|
| **0** | Identity (Auth), Gateway, Secrets | 15m | 0s | Critical infrastructure. Multi-region active-active. |
| **1** | IntelGraph API, Neo4j, Postgres | 30m | 60s | Core business value. Async replication. |
| **2** | Reporting, Batch Jobs, Search Index | 4h | 24h | Can be rebuilt or restored from nightly snapshots. |
| **3** | Dev/Stage Environments | 24h | 24h | Best effort. |

## Verification
* **Drills:** Quarterly chaos drills for Tier 1.
* **Backups:** Nightly verified restore for Tier 1 & 2.
