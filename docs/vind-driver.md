# Vind Driver for Summit

The Vind driver allows Summit to manage Kubernetes clusters running in Docker containers using vCluster.

## Prerequisites
- Docker
- vCluster CLI v0.31.0+

## Configuration
Enable the driver by setting `SUMMIT_VIND_ENABLED=1` in your environment.

## Usage
The driver provides methods for:
- Creating/Deleting clusters
- Pausing/Resuming clusters (Lifecycle)
- Probing LoadBalancer support
- Benchmarking image cache performance

## CI/CD Integration
Two GitHub Actions workflows are available:
- `e2e-vind-smoke.yml`: Basic create/delete smoke test.
- `e2e-vind-lifecycle.yml`: Pause/resume lifecycle test.

Set `SUMMIT_VIND_CI=1` and `SUMMIT_VIND_LIFECYCLE=1` in your GitHub Actions secrets/variables to enable them.
