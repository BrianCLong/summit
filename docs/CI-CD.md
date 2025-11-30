# CI/CD & Promotion Flow

## Workflows

### 1. `ci.yml` (Backbone)
- **Triggers**: Push to `main`, PRs.
- **Stages**:
    - Fast Checks (Lint, Typecheck)
    - Build & Test (Unit, Integration)
    - Build Container (GHCR)
- **Artifacts**: Docker Image, Build Artifacts

### 2. `security.yml`
- **Tools**: CodeQL, Dependency Review.
- **Gate**: Must pass for merge.

### 3. `sbom-provenance.yml`
- **Action**: Generates SPDX SBOM using Syft.
- **Action**: Signs image with Cosign (Keyless or Key).
- **Action**: Generates SLSA Provenance.

### 4. `preview-env.yml`
- **Trigger**: PR opened/labeled.
- **Action**: Deploys ephemeral environment via Helm.
- **Features**:
    - Auto-seeds data (`ops/seed_demo.sh`).
    - Posts sticky comment with URL.
    - Auto-teardown on PR close.

### 5. `canary-rollback.yml`
- **Trigger**: Release tag or manual dispatch.
- **Flow**:
    - Deploy Stage -> Verify -> Approve
    - Deploy Prod (Canary 10% -> 50% -> 100%)
    - Monitor SLOs (P95 Latency, Error Rate)
    - Auto-rollback if SLOs breached.

### 6. `migration-gate.yml`
- **Check**: Detects changes in `server/db/migrations`.
- **Enforcement**: Requires `MIGRATION_APPROVED=true` to pass.

### 7. `k6-gates.yml`
- **Action**: Runs k6 smoke/load tests against environment.
- **Thresholds**: P95 < 1500ms, Errors < 1%.

## How to Configure

1. **Secrets**:
   - `PROM_URL`: Prometheus URL for SLO checks.
   - `GHCR_TOKEN` / `GITHUB_TOKEN`: For image pushing.
   - `KUBE_CONFIG` / OIDC: For deployment.

2. **Branch Protection**:
   - Require: `ci`, `security`, `migration-gate`, `k6-gates`.
   - Enable Merge Queue.

3. **Policy**:
   - Apply `policy/kyverno/verify-signature.yaml` to cluster to enforce signed images.
