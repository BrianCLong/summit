# Golden Path Platform Template

This template provides a production-ready scaffold for platform teams that need a paved-road microservice and job workflow with reproducible builds, signed artifacts, and policy-gated deployments. The repository is designed to satisfy the "Golden Path Platform" objectives:

- **Services**: A `hello-service` HTTP API and a `hello-job` scheduled worker.
- **Security & Compliance**: Reproducible, immutable images with cosign signatures, SBOMs, and SLSA provenance attestations.
- **Automation**: CI/CD pipelines that build → test → scan → generate SBOMs → sign → attest → push → deploy via Helm with OPA policy gates and canary rollouts.
- **Operations**: Release management, rollback playbooks, and environment promotion workflows for dev, stage, and prod.

The scaffold favors convention over configuration so platform and application teams can focus on business logic while inheriting secure defaults.

## Repository Layout

```text
.
├── .github/workflows/      # CI/CD workflows with pinned actions and sigstore integration
├── docs/                   # ADR, C4 diagram, runbooks, and compliance evidence templates
├── helm/                   # Helm charts for hello-service and hello-job + environment overlays
├── jobs/hello-job/         # Go worker implementation + Dockerfile
├── scripts/                # Automation scripts (SBOM, signing, policy checks)
├── services/hello-service/ # Go HTTP API implementation + Dockerfile
├── Makefile                # Reproducible build, test, scan, deploy targets
└── Taskfile.yml            # Task runner for local developers (Taskfile compatible)
```

## Getting Started

1. **Install toolchain**: Go 1.22+, Docker, Task (or make), cosign, syft, trivy, kubectl, helm, opa.
2. **Bootstrap dependencies**:
   ```bash
   task bootstrap
   ```
3. **Run local builds**:
   ```bash
   task build
   task test
   ```
4. **Preview Helm charts**:
   ```bash
   task helm:template ENV=dev
   ```
5. **Simulate CI signing**:
   ```bash
   COSIGN_EXPERIMENTAL=1 task sign SBOM_OUTPUT=artifacts/hello-service-sbom.spdx.json
   ```

See the documentation under `docs/` for release management, rollback drills, and compliance evidence expectations.

