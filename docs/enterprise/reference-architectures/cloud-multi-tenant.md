# Cloud Multi-Tenant Reference Architecture

## Overview
This reference architecture details a cost-effective, scalable multi-tenant deployment of Summit. It leverages logical isolation to serve multiple customers from a shared infrastructure, suitable for SaaS offerings.

## Network Topology
- **VPC:** Shared VPC with public/private subnets.
- **Isolation:** Network Policies (Calico/Cilium) enforce namespace isolation.
- **Ingress:** Shared ALB with host-based routing per tenant (e.g., `tenant1.api.summit.com`).

## IAM Boundaries
- **Tenancy Model:**
  - Shared compute resources.
  - Logical separation via Kubernetes Namespaces.
- **Identity:**
  - Centralized IdP for all users.
  - Tenant-scoped RBAC policies.

## Data Flows
- **Request Routing:** Ingress Controller routes traffic based on Host header to tenant-specific services or shared services with tenant context.
- **Data Isolation:**
  - **Option A (Logical):** Shared Database with `tenant_id` column in all tables. Row-Level Security (RLS) enforced.
  - **Option B (Physical):** Separate Schema/Database per tenant for critical data.

## Logging & Monitoring
- **Logging:** Structural logging includes `tenant_id` context. Logs aggregated but queryable by tenant.
- **Monitoring:** Metrics tagged with `tenant_id` for per-tenant utilization tracking.

## Backup & Recovery
- **Strategy:** Shared backup of global state. Tenant-specific restore capabilities depend on data isolation strategy.
- **DR:** Region failover for the entire platform.

## Upgrade Path
- **Strategy:** Canary deployments.
- **Process:**
  1. Deploy to "internal" tenant.
  2. Roll out to percentage of traffic/tenants.
  3. Full rollout.
