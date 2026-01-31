# Summit 'vind' Cluster Driver

The 'vind' (vCluster in Docker) driver enables fast Kubernetes cluster creation for dev/test/CI using Docker as the substrate.

## Prerequisites
- Docker Desktop or Docker Engine
- vCluster CLI (v0.31.0+)
- kubectl

## Enabling in CI
Set the repository variable `SUMMIT_VIND_CI=1` to enable the smoke test workflow.
Set `SUMMIT_VIND_LIFECYCLE=1` to enable the lifecycle test workflow.

## Lifecycle Commands
The driver supports the following operations via the `VindDriver` class:
- `create`: Provision a new vCluster in Docker.
- `delete`: Teardown a cluster.
- `pause`: Suspend cluster resources.
- `resume`: Wake up a suspended cluster.

## Troubleshooting
- Check Docker logs for containers named `vcluster-*`.
- Ensure the Docker driver is active: `vcluster use driver docker`.
