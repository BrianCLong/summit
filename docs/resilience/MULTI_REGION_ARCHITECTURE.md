# Summit Multi-Region Architecture

**Claim ID:** ARC-001
**Status:** Architectural Capability (Implemented)

## Overview

Summit utilizes a multi-region architecture designed for high availability and disaster recovery. The system is deployed across three primary regions to ensure data residency compliance and operational resilience.

## Regions

1.  **Primary (US-East):** Handles all write traffic and read traffic for US-based tenants.
2.  **Secondary (US-West):** Active replica for disaster recovery; can serve read traffic.
3.  **Tertiary (EU):** Sovereign region for GDPR-bound tenants; fully isolated data plane.

## Replication Strategy

- **PostgreSQL:** Asynchronous streaming replication from Primary to Secondary.
- **Neo4j:** Causal Clustering across availability zones within a region; cross-region replication via ETL.
- **Failover:** Automated DNS failover via Route53 (RTO < 5m, RPO < 1m).
