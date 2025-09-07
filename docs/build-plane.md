# Maestro Build Plane Documentation

## Overview

The Maestro Build Plane provides a secure, fast, and reproducible CI/CD system for the IntelGraph monorepo with:

- **Deterministic builds** with Turborepo + pnpm workspaces
- **Supply chain security** with SBOM generation, Trivy scanning, and Cosign signing
- **Policy enforcement** via OPA/Conftest gates
- **Ephemeral preview environments** per PR
- **Real-time build visibility** via the Maestro Build HUD

## Architecture

```
[GitHub PR] → [Maestro CI Workflow] → [Build & Scan] → [Policy Gates] → [Preview Deploy] → [Build HUD]
     ↓              ↓                      ↓              ↓               ↓
   Events      Docker Images         OPA Policies    K8s Namespaces   WebSocket Updates
     ↓         SBOM + Trivy           Conftest       Helm Charts      Real-time Status
 Webhooks      Cosign Signing       Security Rules  Auto-cleanup     jQuery Filtering
```

## Quick Start

### 1. Prerequisites

```bash
# Install dependencies
pnpm install
npx playwright install

# Required secrets in GitHub repository:
# - KUBECONFIG_B64: Base64 encoded kubeconfig for preview cluster
# - KUBECONFIG_STAGING_B64: Base64 encoded kubeconfig for staging
# - SLACK_WEBHOOK_URL: Slack notifications (optional)
```

### 2. Local Development

```bash
# Start all services in dev mode
pnpm run dev

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Policy validation
conftest test --policy policy services/**/Dockerfile
```

### 3. Preview Environment Setup

Configure your Kubernetes cluster with:

```bash
# Install ingress controller
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx

# Install cert-manager for TLS
helm upgrade --install cert-manager jetstack/cert-manager --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: team@intelgraph.dev
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Component Details

### Turborepo Configuration

**File**: `turbo.json`

- Orchestrates builds across the monorepo
- Caches build outputs and test results
- Defines dependency graph between packages
- Supports remote caching for team builds

### Docker Images

**Location**: `services/{server,client}/Dockerfile`

Features:

- Multi-stage builds with distroless final stage
- Non-root user (65532)
- Security labels and health checks
- Build cache optimization

### Policy as Code

**Location**: `policy/`

- `docker.rego`: Dockerfile security policies
- `helm.rego`: Kubernetes security policies
- Enforced via Conftest in CI pipeline

### GitHub Actions Workflows

**Files**: `.github/workflows/maestro-*.yml`

#### CI Workflow (`maestro-ci.yml`)

- Triggered on PR events
- Lint → Test → Build → Scan → Sign → Deploy → E2E
- Policy gates block unsafe deployments
- Preview environment per PR

#### Release Workflow (`maestro-release.yml`)

- Triggered on main branch push
- Semantic versioning with conventional commits
- Automated changelog generation
- Staging deployment with smoke tests

### Helm Charts

**Location**: `helm/intelgraph/`

Features:

- Secure pod security contexts
- Resource limits and health checks
- Preview-friendly configuration
- Auto-cleanup annotations

### Build Hub Service

**Location**: `services/build-hub/`

WebSocket service that aggregates:

- GitHub workflow events
- Kubernetes deployment status
- Security scan results
- Test outcomes

### Maestro Build HUD

**Location**: `apps/web/src/components/MaestroBuildHUD.tsx`

Real-time dashboard showing:

- PR status and preview links
- Security scan results and SBOM links
- Test results (unit, E2E, security)
- Image signatures and policy compliance

## Security Features

### Supply Chain Security

1. **SBOM Generation**: Every image includes a Software Bill of Materials
2. **Vulnerability Scanning**: Trivy scans for CVEs in dependencies
3. **Image Signing**: Cosign keyless signing with GitHub OIDC
4. **SLSA Provenance**: Build provenance attestation

### Policy Enforcement

1. **Docker Policies**:
   - No root users in final images
   - Pinned base image versions
   - Required OCI labels
   - No excessive capabilities

2. **Kubernetes Policies**:
   - Security contexts required
   - Resource limits enforced
   - Non-root pod security
   - Required labels for tracking

### Access Control

- RBAC for preview environments
- Signed commits required for releases
- Policy exemptions require code owner approval
- Webhook signature verification

## Operational Procedures

### Creating a New Service

1. Create service directory: `services/my-service/`
2. Add Dockerfile following security template
3. Add to turbo.json pipeline
4. Update Helm chart if needed
5. Test policy compliance: `conftest test --policy policy services/my-service/Dockerfile`

### Policy Exemptions

Add `policy:exempted` label to PR and get code owner approval:

```yaml
# In PR description
labels:
  - policy:exempted
# Requires approval from CODEOWNERS
```

### Debugging Failed Builds

1. Check GitHub Actions logs for specific failures
2. Review policy violations in Conftest output
3. Inspect preview environment: `kubectl get all -n pr-123`
4. View build hub logs: `kubectl logs -f deployment/build-hub`

### Emergency Procedures

**Rollback Release**:

```bash
helm rollback intelgraph -n staging
```

**Bypass Policy (Emergency Only)**:

```bash
# Add to workflow environment
POLICY_BYPASS: "emergency-2024-01-15"
```

**Manual Preview Cleanup**:

```bash
kubectl delete namespace pr-123
```

## Monitoring and Observability

### Metrics

The Build HUD tracks:

- Build success/failure rates
- Policy violation trends
- Preview environment usage
- Security scan results

### Alerts

Configure alerts for:

- High build failure rate (>10%)
- Critical vulnerabilities detected
- Policy bypasses used
- Preview environment resource limits

### Logs

Key log locations:

- GitHub Actions: Build pipeline logs
- Build Hub: WebSocket connection logs
- Kubernetes: Preview environment logs
- Trivy: Security scan reports

## Troubleshooting

### Common Issues

**Build fails with "no space left"**:

- Check Docker build cache usage
- Increase runner disk space
- Optimize Docker layer caching

**Preview environment not accessible**:

- Verify ingress controller status
- Check DNS configuration
- Validate TLS certificate

**Policy violations blocking deployment**:

- Review Conftest output
- Check policy files for recent changes
- Consider exemption if justified

**WebSocket connection failures**:

- Verify build-hub service health
- Check firewall/proxy settings
- Inspect browser network tab

### Debug Commands

```bash
# Check build cache
docker system df

# Validate Helm template
helm template intelgraph helm/intelgraph --debug

# Test WebSocket locally
wscat -c ws://localhost:3080/api/buildhub

# Policy dry run
conftest test --policy policy --output table services/**/Dockerfile
```

## Contributing

### Adding New Policies

1. Create policy file in `policy/` directory
2. Write tests in `policy/*_test.rego`
3. Update documentation
4. Test with `conftest verify --policy policy`

### Extending Build HUD

1. Add new fields to `BuildEvent` interface
2. Update WebSocket service to emit new data
3. Enhance React component display
4. Test with `/api/test-event` endpoint

### Performance Optimization

- Use Turbo remote caching for faster builds
- Optimize Docker layer caching strategies
- Consider BuildKit for advanced features
- Profile and optimize policy evaluation

---

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Open Policy Agent](https://www.openpolicyagent.org/)
- [Cosign Signing](https://docs.sigstore.dev/cosign/overview/)
- [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
- [Trivy Scanner](https://trivy.dev/)
