# Runbook: Deploy Field Air-Gapped Natsec

This runbook provides instructions for deploying the `airgapped_natsec` deployment profile for a `natsec_high_security` tenant.

**Audience:** Operations teams deploying Summit for customers in secure, air-gapped environments.

## Pre-requisites

- **Infrastructure:** A Kubernetes cluster (v1.21+) with Helm (v3+) installed. All required container images must be pre-loaded into a local container registry.
- **Access:**
  - `kubectl` access to the Kubernetes cluster.
  - Access to the Summit Git repository and all dependencies on a local, air-gapped network.
  - Access to any required secrets for the `natsec_high_security` tenant profile.

## Deployment Steps

### 1. Choose Tenant and Deployment Profiles

The tenant profile is `natsec_high_security` and the deployment profile is `airgapped_natsec`.

### 2. Run GA Dry-Run & Risk Validation

Before deploying, run the GA gate and risk validation checks in dry-run mode to ensure the deployment is safe.

```sh
./scripts/deploy/run_deploy.mjs --profile airgapped_natsec --mode dry-run
```

Review the output of the dry-run to ensure all checks pass and the deployment plan is as expected.

### 3. Run Deploy in Apply Mode

Once the dry-run is verified, execute the deployment in apply mode.

```sh
./scripts/deploy/run_deploy.mjs --profile airgapped_natsec --mode apply
```

This will execute the deployment commands and create the Summit stack.

### 4. Verify Endpoints & Health Checks

After the deployment is complete, verify that all services are running and healthy.

- Check the Kubernetes pods: `kubectl get pods -l app.kubernetes.io/name=summit`
- Access the Summit API endpoint.
- Check the Grafana dashboard for any alerts.

## Rollback

- **Reference:** See the main `RUNBOOKS/ROLLBACK_PRODUCTION.md` for the general rollback process.
- **Profile-Specific Details:** For this profile, the primary rollback mechanism is to use `helm rollback` to revert to a previous, stable release.
