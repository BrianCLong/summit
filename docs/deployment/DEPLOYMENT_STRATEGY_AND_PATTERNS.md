# Deployment Strategy & Patterns

**Owner**: On-Prem, Private Cloud & Edge Deployments Team
**Status**: Draft
**Last Updated**: October 2025

## 1. Executive Summary

CompanyOS is designed to operate across a spectrum of environments, from our fully managed SaaS control plane to deeply constrained, air-gapped edge nodes. This document defines the supported deployment modes, the architectural patterns that enable them, and the decision matrix for choosing the right model.

Our core philosophy is **"Write Once, Deploy Anywhere"**, achieved through:
*   Containerized, immutable artifacts.
*   Strict separation of Control Plane (Management) and Data Plane (Execution).
*   Abstracted infrastructure interfaces.

## 2. Deployment Modes

We support four primary deployment modes. Each represents a specific trade-off between operational convenience and data sovereignty.

### Mode A: SaaS Multi-Tenant (Baseline)
*   **Description**: The standard CompanyOS experience. Customers consume the service purely over the internet.
*   **Infrastructure**: Fully managed by CompanyOS (AWS/GCP/Azure).
*   **Data Model**: Data resides in multi-tenant storage with strict logical isolation (RLS, OPA).
*   **Management**: CompanyOS Ops Team handles upgrades, security, and scaling.
*   **Best For**: Small to Mid-sized orgs, rapid onboarding, non-classified workloads.

### Mode B: Dedicated Single-Tenant (Private Cloud)
*   **Description**: A dedicated instance of the full CompanyOS stack running in a cloud account, but managed by CompanyOS.
*   **Infrastructure**: CompanyOS-managed VPC (or customer VPC with strict peering/access).
*   **Data Model**: Physically isolated databases and storage. No data commingling.
*   **Management**: CompanyOS Ops Team (via remote access/automation).
*   **Best For**: Enterprise customers with strict isolation requirements but who do not want to manage infra.

### Mode C: On-Prem / Customer-Controlled (Constrained)
*   **Description**: CompanyOS deployed into infrastructure fully owned and operated by the customer. May be connected or air-gapped.
*   **Infrastructure**: Customer's Data Center, Private Cloud (e.g., OpenShift, VMWare), or GovCloud.
*   **Data Model**: Data never leaves the customer's boundary.
*   **Management**: Customer Ops Team (using CompanyOS provided Operators/Bundles). Upgrades are "pulled" or manually applied.
*   **Best For**: Defense, Intelligence, Highly Regulated Industries (Banking, Healthcare), Sovereign Clouds.

### Mode D: Edge Node (Satellite)
*   **Description**: A lightweight subset of CompanyOS running on resource-constrained field devices.
*   **Infrastructure**: Edge servers, ruggedized hardware, tactical cloudlets.
*   **Data Model**: Local ephemeral storage with sync capability to a parent node (SaaS or On-Prem).
*   **Management**: Remote fleet management from the Parent Node.
*   **Best For**: Forward deployed units, factory floors, ships, disconnected operations.

## 3. Deployment Modes Decision Matrix

| Feature / Requirement | **SaaS (Mode A)** | **Dedicated (Mode B)** | **On-Prem (Mode C)** | **Edge (Mode D)** |
| :--- | :--- | :--- | :--- | :--- |
| **Infra Ownership** | CompanyOS | CompanyOS | Customer | Customer |
| **Data Sovereignty** | Logical Isolation | Physical Isolation | Strict Sovereignty | Local / Ephemeral |
| **Connectivity** | Always Online | Always Online | Online or Air-Gapped | Intermittent / DIL |
| **Ops Responsibility** | CompanyOS | CompanyOS | Customer | Hybrid / Automated |
| **Upgrade Cadence** | Continuous (Daily/Weekly) | Scheduled (Weekly/Monthly) | Manual / On-Demand | Fleet Policy |
| **Pricing Model** | Usage / Seat | Subscription + Infra Fee | License + Support | Per Node / Fleet |
| **Hardware Reqs** | N/A | Standard Cloud | High Availability Cluster | Minimal (Single Node) |
| **Key Management** | CompanyOS Managed | CompanyOS or BYOK | Customer Managed (HSM) | TPM / Local |

## 4. Architectural Patterns

To support these modes without maintaining four separate codebases, we rely on specific architectural patterns.

### 4.1. Data Plane vs. Control Plane Split

We decouple the **Control Plane** (Configuration, Policy, User Management, Billing) from the **Data Plane** (Ingestion, Processing, Storage, Inference).

*   **SaaS**: Control and Data planes run together.
*   **On-Prem/Edge**: The **Data Plane** runs locally. The **Control Plane** can either be:
    *   *Local* (Full Stack Deployment): For complete autonomy.
    *   *Remote* (Tethered Deployment): Policy and Config come from SaaS; Data stays local.

### 4.2. The "Tethered" Pattern (Hybrid)
For many enterprise customers, a "Tethered" model is preferred. The heavy lifting (and sensitive data) stays on-prem (Data Plane), but the metadata, audit logs, and policy management leverage the SaaS Control Plane. This simplifies the on-prem footprint.

### 4.3. The "Air-Gap" Pattern (Autonomous)
For Mode C (Air-Gapped) and Mode D (Disconnected), the system must function with **Zero Trust** of the outside world and **Zero Dependency** on external APIs.
*   **Bundled Dependencies**: All artifacts (Docker images, OPA bundles, ML Models) are shipped in a monolithic, signed tarball.
*   **Local Licensing**: License keys are cryptographically signed and validated offline.
*   **Sneakernet Updates**: Upgrades are applied via physical media or secure file transfer.

## 5. Component Portability

Not all components are suitable for all modes.

| Component | SaaS | Dedicated | On-Prem | Edge |
| :--- | :---: | :---: | :---: | :---: |
| **Core API (GraphQL)** | ✅ | ✅ | ✅ | ✅ (Lightweight) |
| **Web Frontend** | ✅ | ✅ | ✅ | ✅ (Local UI) |
| **PostgreSQL (Metadata)** | ✅ | ✅ | ✅ | ✅ (SQLite option) |
| **Neo4j (Graph DB)** | ✅ | ✅ | ✅ | ❌ (Use embedded graph or simple relational) |
| **Maestro (Orchestrator)** | ✅ | ✅ | ✅ | ✅ (Local Agent) |
| **LLM Inference (GPU)** | ✅ | ✅ | ✅ (Requires GPU) | ⚠️ (Small Models / SLM only) |
| **Billing / Stripe** | ✅ | ✅ | ❌ | ❌ |
| **Global User Directory** | ✅ | ⚠️ (Federated) | ❌ (Local LDAP/OIDC) | ❌ (Local Auth) |

## 6. Migration Paths

Customers often move "up the stack" of isolation.
*   **SaaS -> Dedicated**: Database export/import.
*   **Dedicated -> On-Prem**: Full backup/restore. Requires matching versions.
*   **Edge -> Core**: Edge nodes sync data upstream; they do not "migrate" to become core nodes.
