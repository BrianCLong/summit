# Service Level Objectives (SLO) Catalog

## 1. Introduction

This catalog defines the Service Level Indicators (SLIs), Service Level Objectives (SLOs), and Error Budgets for the Summit platform. It serves as the operational contract between the platform engineering team and product stakeholders.

## 2. Global Alerting Policy

- **P1 (Page)**: Imminent SLO breach (burn rate > 14.4x) or complete outage. Requires immediate response (15m SLA).
- **P2 (Ticket)**: Potential SLO breach (burn rate > 6x) or degradation. Requires business-day response (4h SLA).
- **P3 (Log)**: Minor anomaly or informational. Reviewed weekly.

### Burn Rate Thresholds

| Window | Burn Rate | Alert Level | Action         |
| :----- | :-------- | :---------- | :------------- |
| 1h     | 14.4x     | P1          | Page On-Call   |
| 6h     | 6x        | P2          | Ticket to Team |
| 3d     | 1x        | P3          | Log for Review |

## 3. Core User Journeys & SLOs

### 3.1. API Availability & Latency

**Owner:** Platform Team (Gateway Service)

| SLI Name         | Definition                                                           | Target (Dev) | Target (Stage) | Target (Prod) |
| :--------------- | :------------------------------------------------------------------- | :----------- | :------------- | :------------ |
| **Availability** | Ratio of non-5xx requests to total requests.                         | 99.0%        | 99.9%          | 99.95%        |
| **Latency P95**  | P95 latency of GraphQL queries (excluding heavy analytical queries). | < 500ms      | < 350ms        | < 300ms       |
| **Latency P99**  | P99 latency of GraphQL queries.                                      | < 1000ms     | < 800ms        | < 750ms       |
| **Error Rate**   | Ratio of 5xx errors to valid requests.                               | < 1%         | < 0.1%         | < 0.05%       |

### 3.2. Authentication & Authorization

**Owner:** Identity Team (Auth Service)

| SLI Name              | Definition                                     | Target (Dev) | Target (Stage) | Target (Prod) |
| :-------------------- | :--------------------------------------------- | :----------- | :------------- | :------------ |
| **Auth Availability** | Ratio of successful token issuance/validation. | 99.0%        | 99.9%          | 99.99%        |
| **Auth Latency**      | P95 time to issue or validate a token.         | < 200ms      | < 100ms        | < 100ms       |

### 3.3. Asynchronous Ingestion

**Owner:** Data Team (Ingestion Service)

| SLI Name       | Definition                          | Target (Dev) | Target (Stage) | Target (Prod) |
| :------------- | :---------------------------------- | :----------- | :------------- | :------------ |
| **Queue Lag**  | Time from job enqueue to job start. | < 60s        | < 30s          | < 10s         |
| **Throughput** | Jobs processed per minute.          | > 100        | > 500          | > 1000        |

### 3.4. Data Freshness

**Owner:** Data Team (Pipeline Service)

| SLI Name            | Definition                                                  | Target (Dev) | Target (Stage) | Target (Prod) |
| :------------------ | :---------------------------------------------------------- | :----------- | :------------- | :------------ |
| **Graph Freshness** | Time delta between event occurrence and query availability. | < 5m         | < 2m           | < 1m          |

## 4. Service Boundary Mapping

| Component                 | Responsibility        | Relevant SLOs                                |
| :------------------------ | :-------------------- | :------------------------------------------- |
| `server` (Express/Apollo) | Synchronous API, Auth | API Availability, Latency, Auth Availability |
| `ingestion-service`       | Async Workers         | Queue Lag, Throughput                        |
| `neo4j`                   | Graph Storage         | Data Freshness (contributor)                 |
| `postgres`                | Relational Storage    | Auth Latency (contributor)                   |

## 5. Evidence Linkage

This document is a governed artifact. Changes must be approved by the Operational Review Board.
Evidence of SLO compliance is generated weekly and stored in `docs/evidence/slo-reports/`.

---

**Last Updated:** $(date +%Y-%m-%d)
**Status:** DRAFT
