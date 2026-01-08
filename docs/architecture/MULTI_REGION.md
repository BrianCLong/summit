# Multi-Region Deployment & Disaster Recovery Architecture

## Overview

This document outlines the architecture for a multi-region deployment of the Summit/IntelGraph platform on AWS. The goal is to achieve zero-downtime failover, high availability, and compliance with data residency requirements, while optimizing for cost.

## High-Level Architecture

We employ an **Active-Active** architecture for stateless services and an **Active-Passive** (Hot Standby) architecture for stateful data layers, orchestrated via Global Load Balancing.

### Regions

- **Primary Region**: `us-west-2` (Oregon)
  - Full capacity scaling.
  - Primary Write Master for databases.
- **Secondary Region**: `us-east-1` (N. Virginia)
  - Scaled capacity (can auto-scale up during failover).
  - Read Replicas for databases.
  - Active-Active for read-only traffic; Failover target for write traffic.

### Global Load Balancing

Traffic is routed using **AWS Route53** with a combination of policies:

1.  **Latency-Based Routing**: Users are routed to the region with the lowest latency for standard read/stateless requests. This effectively provides **Active-Active** behavior for the stateless layer.
2.  **Health Checks**: Route53 monitors the health of the Application Load Balancers (ALB) in each region.
3.  **Failover via Health Checks**: If the Primary region is unhealthy (Health Check fails), Route53 automatically stops routing traffic to it, shifting all users to the Secondary region.

## Compute Layer (Kubernetes/EKS)

Each region hosts an independent EKS cluster (`primary-cluster`, `secondary-cluster`).

- **Stateless Services**: Deployed identically to both clusters (e.g., API Server, Web Client).
- **Deployment**: CI/CD pipelines deploy to both clusters simultaneously (or staggered for safety).
- **Auto-Scaling**: Horizontal Pod Autoscalers (HPA) and Cluster Autoscalers operate independently based on local regional load.

## Data Layer & Replication

### PostgreSQL (RDS)

- **Configuration**: Multi-AZ RDS instance in the Primary Region.
- **Replication**: Cross-Region Read Replica in the Secondary Region.
- **Failover**:
  - In a disaster scenario, the Read Replica in the Secondary Region is promoted to Standalone Master.
  - Application configuration in the Secondary Region is updated to point to the new Master (or uses a CNAME switch).
- **RPO**: Typically < 5 minutes (async replication lag).
- **RTO**: < 15 minutes (promotion time).

### Redis (ElastiCache)

- **Configuration**: Global Datastore for Redis.
- **Replication**: Primary cluster in `us-west-2`, secondary cluster in `us-east-1`.
- **Failover**: Global Datastore allows promoting the secondary cluster to primary with low latency.

### Neo4j (Graph DB)

- **Configuration**: Causal Clustering across regions (Enterprise) or asynchronous backup/restore for Standard.
- **Strategy**: For this MVP, we use **Asynchronous Replication** or **Periodic Snapshots** if Enterprise Multi-Region is not available.
  - _Target_: Neo4j 5.x Autonomous Clustering (if applicable) or Read Replicas.

### Object Storage (S3)

- **Configuration**: S3 Cross-Region Replication (CRR).
- **Buckets**: `intelgraph-data-us-west-2` replicates to `intelgraph-data-us-east-1`.
- **Versioning**: Enabled to protect against accidental deletion.

## Networking

- **VPC Peering**: Optional, but recommended for secure cross-region data replication if not using public endpoints with TLS.
- **Transit Gateway**: For complex multi-account/multi-region networking.

## Disaster Recovery Plan (DR)

### Scenarios

1.  **Region Failure**: Complete outage of `us-west-2`.
    - Route53 detects failure -> routes traffic to `us-east-1`.
    - RDS Read Replica promoted.
    - Redis Global Datastore failed over.
2.  **Zone Failure**: Outage of one AZ.
    - Handled automatically by Multi-AZ RDS and EKS distribution.

### Automation

- **Health Monitors**: CloudWatch alarms trigger Lambda functions or PagerDuty.
- **Runbooks**: Automated scripts to promote read replicas and update configuration.

## Cost Optimization

- **Secondary Region**:
  - Runs a minimal footprint for stateless services (scaled down to 1-2 replicas).
  - Auto-scaling rules set to scale up aggressively only when load increases (failover event).
  - Spot Instances used for non-critical workloads in the secondary region.
