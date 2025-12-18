# Zero-Downtime Deployment Strategy

This document outlines the zero-downtime deployment strategy with automatic rollback for the Summit platform.
The strategy supports both **Kubernetes** (using Ingress/Service Mesh) and **VM/Bare Metal** (using Nginx) environments.

## Strategy: Blue-Green Deployment

We utilize a **Blue-Green Deployment** strategy to ensure zero downtime.
- **Blue (Current)**: The version currently serving live traffic.
- **Green (New)**: The new version being deployed.

### The Process

1.  **Provision Green**: The new version (Green) is spun up alongside the existing version (Blue).
2.  **Health Check**: The deployment orchestrator waits for Green to become healthy (passing `/health/ready` checks).
3.  **Smoke Tests**: Automated smoke tests run against the Green environment to verify critical functionality.
4.  **Traffic Switch**: The load balancer is updated to switch 100% of traffic from Blue to Green. This is atomic or near-atomic.
5.  **Monitoring**: The orchestrator monitors error rates and latency for a "soak time".
6.  **Completion**: If stable, Blue is decommissioned. If unstable, traffic is instantly reverted to Blue (Rollback).

## Automatic Rollback

The `RollbackEngine` handles failures at any stage:
- **Pre-Switch Failure**: If Green fails health checks, deployment is aborted. No traffic is impacted.
- **Post-Switch Failure**: If Green shows high error rates or latency after the switch, the Load Balancer is immediately reverted to point to Blue.
- **Database Rollback**: If database migrations were applied, the `RollbackEngine` attempts to revert them using the `db_rollback.cjs` script.

## Infrastructure Configuration

### Option A: VM / Bare Metal (Nginx)

The `NginxLoadBalancerAdapter` manages an Nginx upstream configuration file.

```nginx
upstream backend {
    # Blue (Active)
    server 127.0.0.1:3000;
    # Green (Inactive)
    # server 127.0.0.1:3001;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

### Option B: Kubernetes (K8s)

In Kubernetes, this strategy is implemented using **Argo Rollouts** or **Ingress Controllers** (e.g., Nginx Ingress).

1.  **ReplicaSets**: Two ReplicaSets coexist (Blue and Green).
2.  **Service**: The Service selector is updated to point to the Green ReplicaSet.
3.  **Ingress**: For weighted traffic splitting (Canary), the Ingress annotations (e.g., `nginx.ingress.kubernetes.io/canary-weight`) are updated.

*Note: The current `BlueGreenDeployer` implementation simulates the Nginx approach but can be extended with a `KubernetesAdapter`.*

## Tools & Scripts

- `server/lib/deployment/blue-green-deployer.ts`: Core orchestration logic.
- `server/lib/deployment/rollback-engine.ts`: Logic for reverting state.
- `server/scripts/db_rollback.cjs`: Simulates database migration rollback.
- `scripts/simulate-deployment.ts`: Runs a simulation of the process for testing/dev.

## Usage

To run the deployment simulation:

```bash
npx tsx scripts/simulate-deployment.ts
```
