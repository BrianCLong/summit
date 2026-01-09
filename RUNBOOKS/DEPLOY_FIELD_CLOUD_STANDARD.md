# Runbook: Deploy Field Cloud Standard

This runbook provides instructions for deploying the `cloud_standard` deployment profile for an `enterprise_f100` tenant.

**Audience:** Operations teams deploying Summit for customers on a cloud provider.

## Pre-requisites

- **Infrastructure:** A Docker host (e.g., a virtual machine) with Docker and Docker Compose installed.
- **Access:**
  - Access to the Summit Git repository.
  - Permissions to pull Docker images from the required registry.
  - Access to any required secrets for the `enterprise_f100` tenant profile.

## Deployment Steps

### 1. Choose Tenant and Deployment Profiles

The tenant profile is `enterprise_f100` and the deployment profile is `cloud_standard`.

### 2. Run GA Dry-Run & Risk Validation

Before deploying, run the GA gate and risk validation checks in dry-run mode to ensure the deployment is safe.

```sh
./scripts/deploy/run_deploy.mjs --profile cloud_standard --mode dry-run
```

Review the output of the dry-run to ensure all checks pass and the deployment plan is as expected.

### 3. Run Deploy in Apply Mode

Once the dry-run is verified, execute the deployment in apply mode.

```sh
./scripts/deploy/run_deploy.mjs --profile cloud_standard --mode apply
```

This will execute the deployment commands and create the Summit stack.

### 4. Verify Endpoints & Health Checks

After the deployment is complete, verify that all services are running and healthy.

- Check the Docker containers: `docker-compose -f compose/docker-compose.yml -f compose/deploy/docker-compose.cloud_standard.yml ps`
- Access the Summit API endpoint.
- Check the Grafana dashboard for any alerts.

## Rollback

- **Reference:** See the main `RUNBOOKS/ROLLBACK_PRODUCTION.md` for the general rollback process.
- **Profile-Specific Details:** For this profile, the primary rollback mechanism is to use `docker-compose down` to stop and remove the containers. A new deployment can then be initiated with a previous, stable version of the application.
