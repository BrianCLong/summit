# Infrastructure Parity Gate

## Goal
Prevent infrastructure drift and ensure all environments (dev, stage, prod) match the code in `terraform/environments/`.

## How it works
The `infra-parity.yml` workflow runs on every Pull Request that touches `terraform/**`.
It executes `terraform plan -detailed-exitcode` for each environment.

- **Exit Code 0:** No changes (Parity Achieved).
- **Exit Code 2:** Changes detected (Drift).
- **Exit Code 1:** Error.

## Handling Drift
If your PR fails the Parity Gate with "Drift detected":
1. Check the logs or download the `tfplan` artifact.
2. If the drift is expected (you are changing infra), it will be applied upon merge to `main`.
3. If the drift is unexpected, investigate why the environment (e.g., via AWS Console) differs from the code.

## Merge & Deploy
Once the PR is merged to `main`:
- The `infra-deploy.yml` workflow runs.
- It plans and applies changes to all environments.
- **Production** deployments are gated by the GitHub Environment protection rules (Manual Approval).
