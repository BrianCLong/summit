# GA Core Go/No-Go Helper

The `ga-core-go-nogo.sh` script orchestrates the GA Core staging and validation workflow so the sprint gates can run consistently.

## Prerequisites

- Ensure the required tooling is available on your PATH:
  - `make`
  - `k6`
  - `helm`
  - `docker`
  - `cosign`
- Ensure any cluster contexts and authentication (e.g., Helm/Kubernetes credentials) are configured before running deployment steps.

## Usage

```bash
./scripts/ga-core-go-nogo.sh [options]
```

Options:

- `--deploy-staging` – run the staging Helm upgrade and test suite.
- `--run-validate` – execute `make validate-ga-core`.
- `--run-load` – run the GA Core k6 load test (`load/ga-core.js`).
- `--build-airgap` – produce the air-gap bundle (`docker save` + `cosign sign`).
- `--dry-run` – print the commands without executing them.
- `-h`, `--help` – show usage.

If no options are provided, the script defaults to running validation and load tests.

### Examples

- Run validation and Helm staging flow:

  ```bash
  ./scripts/ga-core-go-nogo.sh --deploy-staging --run-validate
  ```

- Preview load and air-gap steps without execution:

  ```bash
  ./scripts/ga-core-go-nogo.sh --run-load --build-airgap --dry-run
  ```

## Output

Each step is clearly labelled and the script prints a summary of which phases were requested. Combine flags to mirror the sprint gates for staging, validation, load, and air-gap packaging.
