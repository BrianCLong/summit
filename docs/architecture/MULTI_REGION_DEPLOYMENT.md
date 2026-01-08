# Multi-Region Deployment Architecture

## Overview

Summit is deployed across three AWS regions to ensure high availability, low latency, and disaster recovery compliance.

- **Primary Region:** `us-east-1` (N. Virginia)
- **Secondary Region:** `us-west-2` (Oregon)
- **Tertiary Region:** `eu-west-1` (Ireland)

## Components

### Compute

- **EKS Clusters:** Each region hosts an independent EKS cluster running the Summit microservices.
- **Stateless:** Services are stateless; session data is stored in Redis.

### Data Layer

- **Aurora PostgreSQL Global Database:**
  - Primary writer in `us-east-1`.
  - Read replicas in `us-west-2` and `eu-west-1`.
  - **Failover:** Automated promotion of secondary region if primary fails (RTO < 5 min).
- **Redis Global Replication Group:**
  - Active-Passive global replication for session storage and caching.
  - Multi-AZ enabled in all regions.
- **Neo4j Causal Cluster:**
  - 3 Core members in Primary, Read Replicas in other regions.
  - Cross-region Causal Clustering for graph consistency.

### Traffic Management

- **CloudFront:** Serves as the global entry point.
- **Route53:** Uses **Latency Based Routing** to direct users to the nearest healthy region.
- **Health Checks:** Route53 monitors `/health` endpoints. If a region fails, DNS automatically reroutes traffic.

## Data Consistency

- **Strong Consistency:** For critical transaction data (PostgreSQL).
- **Eventual Consistency:** For search indices and feed data.
- **Conflict Resolution:** CRDTs (Conflict-Free Replicated Data Types) are used for distributed state synchronization (e.g., collaborative editing).

## Failover Process

1. **Detection:** Route53 Health Checks detect endpoint failure (30s interval, 3 failures).
2. **Routing Update:** DNS records update to remove the failed region.
3. **Database Promotion:** (If Primary fails) Aurora Global Database initiates failover to Secondary.
4. **Application Recovery:** Services in Secondary region become the new primary writers.

## RTO/RPO Targets

- **RTO (Recovery Time Objective):** < 5 minutes
- **RPO (Recovery Point Objective):** < 1 minute (limited by replication lag)
