# Release Guardrails

This document describes the CD (Continuous Deployment) guardrails system that enforces deployment policies and supply chain security for IntelGraph.

## Overview

The CD guardrails system provides two main protections:

1. **Freeze Windows** - Prevent deployments during maintenance windows, holidays, or high-risk periods
2. **SLSA Provenance Verification** - Ensure all deployed artifacts have verified supply chain attestations

## Quick Start

### 1. Add Guardrails to Your CD Pipeline

```yaml
# .github/workflows/cd.yml
jobs:
  build:
    # ... your build job that outputs image digest

  guardrails:
    needs: build
    uses: ./.github/workflows/cd-guardrails.yml
    with:
      image: ghcr.io/your-org/intelgraph
      digest: ${{ needs.build.outputs.digest }}
      environment: production
    secrets:
      ALLOWED_BUILDER_ID: ${{ secrets.ALLOWED_BUILDER_ID }}
      ALLOWED_OIDC_ISSUER: ${{ secrets.ALLOWED_OIDC_ISSUER }}

  deploy:
    needs: [build, guardrails]
    # ... your deployment job
```

### 2. Configure Required Secrets

Set these repository secrets:

```bash
# GitHub repository settings > Secrets and variables > Actions

ALLOWED_BUILDER_ID: "https://github.com/your-org/repo/.github/workflows/ci.yml@refs/heads/main"
ALLOWED_OIDC_ISSUER: "https://token.actions.githubusercontent.com"
```

### 3. Enable Branch Protection

Add `cd-guardrails / guardrails` to your required status checks on the `main` branch.

## Freeze Windows

### Configuration

Freeze windows are configured in `ops/freeze-windows.yaml`:

```yaml
environments:
  production:
    freeze_windows:
      - name: "Holiday Freeze 2024"
        start: "2024-12-20T00:00:00Z"
        end: "2025-01-06T08:00:00Z"
        reason: "holiday_freeze"

      - name: "Weekend Freeze"
        recurring:
          pattern: "weekly"
          days_of_week: [0, 6]  # Sunday, Saturday
          start_time: "18:00"
          end_time: "08:00"
```

### Override Process

During a freeze window, deployments are blocked unless:

1. **Emergency Override**: Set `CD_OVERRIDE=true` environment variable
2. **Approval Process**: Follow the approval workflow defined in the freeze config

```bash
# Emergency override (requires authorization)
gh workflow run cd.yml -f CD_OVERRIDE=true
```

### Freeze Window Types

1. **Scheduled Freezes** - Planned maintenance windows
2. **Recurring Freezes** - Regular patterns (weekends, holidays)
3. **Emergency Freezes** - Temporary freezes during incidents
4. **Permanent Freezes** - Complete deployment lockdown

## SLSA Provenance Verification

### What It Protects

- Ensures artifacts were built by trusted CI/CD systems
- Verifies build materials and dependencies
- Confirms no tampering during the build process
- Validates certificate-based keyless signing

### Trust Policy

The trust policy in `security/policy/trust-policy.yaml` defines:

- Trusted builders (GitHub Actions workflows)
- Allowed OIDC issuers
- Certificate identity patterns
- Enforcement levels

### Verification Process

1. **Download Attestation** - Fetch SLSA provenance from registry
2. **Verify Signature** - Check cosign signature against OIDC issuer
3. **Validate Builder** - Ensure builder ID matches trust policy
4. **Check Materials** - Verify build inputs and dependencies

## Integration Examples

### Basic CD Pipeline

```yaml
name: Deploy to Production

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - name: Build and push
        id: build
        # ... build steps that output digest

  guardrails:
    needs: build
    uses: ./.github/workflows/cd-guardrails.yml
    with:
      image: ${{ needs.build.outputs.image }}
      digest: ${{ needs.build.outputs.digest }}
      environment: production

  deploy:
    needs: [build, guardrails]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build.outputs.image }}@${{ needs.build.outputs.digest }}"
          # ... deployment steps
```

### Multi-Environment Pipeline

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  build:
    # ... build job

  deploy-staging:
    needs: build
    uses: ./.github/workflows/cd-guardrails.yml
    with:
      image: ${{ needs.build.outputs.image }}
      digest: ${{ needs.build.outputs.digest }}
      environment: staging

  deploy-production:
    needs: [build, deploy-staging]
    if: startsWith(github.ref, 'refs/tags/')
    uses: ./.github/workflows/cd-guardrails.yml
    with:
      image: ${{ needs.build.outputs.image }}
      digest: ${{ needs.build.outputs.digest }}
      environment: production
```

## Emergency Procedures

### Emergency Deployment During Freeze

1. **Assess Risk** - Determine if deployment is critical
2. **Get Approval** - Follow approval process or use CD_OVERRIDE
3. **Document** - Create incident ticket with justification
4. **Deploy** - Use override mechanism
5. **Review** - Conduct post-deployment review

### Override Commands

```bash
# Set override for single deployment
gh variable set CD_OVERRIDE --body "true"

# Deploy with override
gh workflow run cd.yml

# Clear override after deployment
gh variable delete CD_OVERRIDE
```

### Bypass Provenance (Emergency Only)

```bash
# Temporarily disable provenance check (NOT RECOMMENDED)
# This should only be used during critical incidents
# when provenance verification is blocking a security fix

# 1. Update trust policy to allow emergency exception
# 2. Deploy with emergency tag
# 3. Immediately restore normal policy
```

## Monitoring and Alerting

### Metrics

The guardrails system exports these metrics:

- `cd_guardrails_freeze_blocks_total` - Deployments blocked by freeze
- `cd_guardrails_provenance_failures_total` - Provenance verification failures
- `cd_guardrails_overrides_total` - Emergency overrides used

### Alerts

Configure alerts for:

- High number of override usage
- Provenance verification failures
- Long-running freeze windows

```yaml
# Grafana alert example
- alert: HighCDOverrideUsage
  expr: increase(cd_guardrails_overrides_total[24h]) > 5
  for: 0m
  labels:
    severity: warning
  annotations:
    summary: "High number of CD overrides used"
```

## Troubleshooting

### Common Issues

1. **Provenance Verification Fails**
   - Check builder ID matches trust policy
   - Verify OIDC issuer configuration
   - Ensure attestation exists in registry

2. **Freeze Window Not Recognized**
   - Validate YAML syntax in freeze config
   - Check timezone configuration
   - Verify environment name matches

3. **Override Not Working**
   - Confirm CD_OVERRIDE environment variable
   - Check user has override permissions
   - Verify approval process if required

### Debug Commands

```bash
# Test freeze window locally
node tools/ci/check_freeze.js --environment=production

# Verify provenance manually
cosign verify-attestation --type slsaprovenance \
  ghcr.io/your-org/intelgraph@sha256:abc123...

# Check trust policy syntax
yamllint security/policy/trust-policy.yaml
```

## Security Considerations

1. **Trust Boundaries** - Only trusted builders can create deployable artifacts
2. **Key Management** - Use keyless signing with OIDC when possible
3. **Audit Trail** - All override usage is logged and auditable
4. **Principle of Least Privilege** - Minimize override permissions
5. **Defense in Depth** - Combine with other security controls

## References

- [SLSA Framework](https://slsa.dev/)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Supply Chain Security Best Practices](https://github.com/ossf/scorecard)