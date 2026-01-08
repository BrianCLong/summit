# Availability Classes & Targets

## Overview

This document defines the availability classes for Summit workloads and their respective Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO). These targets are strictly enforced and monitored.

## Availability Classes

### 1. Read-Only Queries

- **Description**: Operations that retrieve data without modification. Includes dashboard views, report generation, and API reads.
- **Failover Strategy**: Active/Active (global distribution where allowed) or Active/Passive with automatic failover.
- **Target**: 99.99% Availability.

### 2. Planning (Non-Executing)

- **Description**: Drafting plans, simulations, and "what-if" scenarios that do not result in immediate execution or state change in the critical path.
- **Failover Strategy**: Active/Passive. Can tolerate short interruptions.
- **Target**: 99.9% Availability.

### 3. Evaluation / Self-Testing

- **Description**: Automated system checks, integrity verifications, and background logic.
- **Failover Strategy**: Best-effort. Can pause during regional outages.
- **Target**: 99.0% Availability.

### 4. Approved Write Actions

- **Description**: Critical state mutations (e.g., policy updates, execution commands).
- **Failover Strategy**: Strict Active/Passive or Quorum-based. Must respect data residency.
- **Target**: 99.95% Availability.

### 5. Admin / Policy Operations

- **Description**: Root-level configuration, user management, and sensitive policy changes.
- **Failover Strategy**: Fail Closed. Operations are blocked during split-brain or primary region failure to prevent divergence.
- **Target**: 99.9% Availability.

## RTO / RPO Targets

| Class             | RTO (Recovery Time) | RPO (Data Loss)        | Regional Failover      |
| :---------------- | :------------------ | :--------------------- | :--------------------- |
| **Read-Only**     | < 1 minute          | N/A                    | Automatic              |
| **Planning**      | < 15 minutes        | < 5 minutes            | Automatic (if allowed) |
| **Evaluation**    | < 1 hour            | N/A                    | Manual / Pause         |
| **Write Actions** | < 5 minutes         | 0 (Strict Consistency) | Manual Approval        |
| **Admin/Policy**  | < 30 minutes        | 0 (Strict Consistency) | **FAIL CLOSED**        |

## Owners

- **Global Availability Lead**: Jules
- **Infrastructure Reliability**: DevOps Team
- **Compliance & Audit**: SecOps Team
