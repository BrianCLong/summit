# Neo4j Multi-Region Deployment Analysis

**Date:** 2025-12-03
**Subject:** Analysis of "Multi-region Neo4j Enterprise with causal clustering" requirement vs. Implementation.

## 1. The Claim vs. The Reality

**Requirement:** "Multi-region Neo4j Enterprise with causal clustering"
**Current Implementation:**

- **Primary Region (`us-east-1`):** Deploys a Core Cluster (3 members) via standard Helm Chart.
- **Secondary/Tertiary Regions:** Placeholder configuration for independent deployments.

**Truthfulness Verdict:** **PARTIALLY SIMULATED / DEGRADED**

## 2. Current State Details

The Terraform code currently deploys **Independent Clusters** (or standalone instances) in each region. They are **NOT** joined into a single global Causal Cluster.

**Why?**
Setting up a single Causal Cluster spanning 3 Kubernetes clusters across 3 AWS Regions requires:

1.  **Flat Network / VPN:** Pod-to-Pod communication across regions (e.g., Submariner, Cilium Mesh, or Transit Gateway + Routable Pod IPs).
2.  **Stable DNS:** Each Core member must be addressable by every other member globally.
3.  **Latency Tolerance:** Raft consensus protocol is sensitive to latency. Cross-Atlantic latency (~70-90ms) can cause leader election instability if not carefully tuned.

These prerequisites are **Infrastructure-Heavy** and outside the scope of the current Helm chart configuration provided.

## 3. Deployment Topology

Instead of a single Global Cluster, the current acceptable architecture for this phase is:

**Active-Passive with Async Replication (Simulated)**

- **US-EAST-1:** Active Write Cluster (Core).
- **US-WEST-2 / EU-WEST-1:** Read-Only Replicas (or separate clusters receiving ETL feeds).

_Note: The current Terraform establishes the compute (EKS) and application (Helm), but the actual data synchronization channel between regions for Neo4j is **NOT** configured._

## 4. Gap Analysis & Mitigation

| Feature | Gap | Mitigation / Plan |
| ~~~~ | ~~~~ | ~~~~ |
| **Global Writes** | Writes only possible in Primary. | Application middleware (`CrossRegionSyncService`) handles coordination, or writes are routed to Primary via API. |
| **Failover** | Manual promotion required. No automatic leader election across regions. | Accepted RTO < 5 min allows for scripted failover (restore from backup or promote Read Replica if Enterprise features enabled). |
| **Consistency** | Regions are not causally consistent with each other. | Reliance on Eventual Consistency via application layer sync. |

## 5. Conclusion

We are **downgrading** the claim from "Global Causal Cluster" to **"Regional Clusters with Architecture for Federation"**.

To achieve true Global Causal Clustering, a dedicated "Service Mesh Interconnect" project is required.
