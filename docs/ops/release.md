# Release Artifact Build Guide

> Canonical release process and gating live in `docs/ops/RELEASING.md`. Use this guide for local artifact build details only.

This guide describes how to build versioned release artifacts for the IntelGraph platform from a developer workstation or CI runner. The workflow uses `make release` to create both the Python wheel and a Docker image tagged with the project version derived from `pyproject.toml`.

## Prerequisites

- Python 3.11+ available as `python3`
- Docker CLI with build privileges
- Local checkout with up-to-date sources (`git pull`)

## Standard build

Run the consolidated release target from the repository root:

```bash
make release
```

This command will:

1. Build a Python wheel into the `dist/` directory.
2. Build a Docker image from `Dockerfile` tagged as `intelgraph-platform:<version>` and `intelgraph-platform:latest`.

## Customizing image coordinates

Override image settings at invocation time if you need a fully qualified registry tag:

```bash
IMAGE_NAME=ghcr.io/example/intelgraph IMAGE_TAG=1.2.3 make release
```

- `IMAGE_NAME` defaults to `intelgraph-platform`.
- `IMAGE_TAG` defaults to the version read from `pyproject.toml`.

## Publishing artifacts

- **Wheel**: Upload the file from `dist/` to your package index (e.g., `twine upload dist/intelgraph-<version>-py3-none-any.whl`).
- **Docker image**: Push the generated tags with `docker push <image>:<tag>` after authentication to the target registry.

## Verification steps

- Confirm the wheel metadata contains the expected version:

  ```bash
  python -m zipfile -l dist/intelgraph-<version>-py3-none-any.whl | head
  ```

- Confirm the image tag is present locally:

  ```bash
  docker images | grep intelgraph-platform
  ```

Following these steps ensures releases produce both Python and container artifacts with consistent versioning.
