# Paved-Road CI/CD Pipeline Design

> **Version**: 1.0.0
> **Status**: Draft
> **Last Updated**: 2025-12-06

## Overview

The Golden Path CI/CD pipeline provides a standardized, policy-governed deployment path for all CompanyOS services. Teams opt-in by default and can only opt-out through a documented exception process with explicit guardrails.

---

## 1. Pipeline Architecture

### 1.1 Stage Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GOLDEN PATH CI/CD PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────┐   │
│  │  LINT   │──▶│  TEST   │──▶│ SECURITY│──▶│  BUILD  │──▶│   PUBLISH   │   │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────────┘   │
│       │             │             │             │               │           │
│       ▼             ▼             ▼             ▼               ▼           │
│   ┌───────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐   ┌───────────┐    │
│   │ESLint │   │Unit Tests│  │  SAST    │  │  Docker  │   │  Push to  │    │
│   │Prettier│  │Int Tests │  │  DAST    │  │  Build   │   │  Registry │    │
│   │TypeCheck│ │Coverage  │  │  Trivy   │  │  Cosign  │   │  SBOM     │    │
│   └───────┘   └──────────┘  │  Gitleaks│  │  SBOM    │   │  Attest   │    │
│                              └──────────┘  └──────────┘   └───────────┘    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   DEPLOY    │──▶│   VERIFY    │──▶│  PROMOTE    │──▶│  MONITOR    │    │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
│        │                 │                 │                  │             │
│        ▼                 ▼                 ▼                  ▼             │
│   ┌──────────┐    ┌──────────┐     ┌──────────┐       ┌──────────┐        │
│   │ Preview  │    │  Smoke   │     │  Canary  │       │   SLO    │        │
│   │ Staging  │    │  Health  │     │ Blue/Grn │       │  Alerts  │        │
│   │Production│    │  SLO     │     │ Traffic  │       │ Rollback │        │
│   └──────────┘    └──────────┘     └──────────┘       └──────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Stage Details

| Stage | Purpose | Duration Target | Required |
|-------|---------|-----------------|----------|
| **Lint** | Code quality and style | < 2 min | Yes |
| **Test** | Functional correctness | < 10 min | Yes |
| **Security** | Vulnerability scanning | < 5 min | Yes |
| **Build** | Container image creation | < 5 min | Yes |
| **Publish** | Registry push + attestation | < 2 min | Yes |
| **Deploy** | Environment deployment | < 5 min | Yes |
| **Verify** | Health + smoke tests | < 5 min | Yes |
| **Promote** | Progressive rollout | Variable | Tier 1-2 |
| **Monitor** | Post-deploy observability | Continuous | Yes |

**Total Pipeline Target**: < 30 minutes for full production deployment

---

## 2. Stage Specifications

### 2.1 Lint Stage

**Purpose**: Enforce code quality, style consistency, and type safety.

```yaml
lint:
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v4

    - name: Setup Environment
      uses: ./.github/actions/setup-node-pnpm

    - name: ESLint
      run: pnpm --filter ${{ inputs.service }} lint

    - name: Prettier Check
      run: pnpm --filter ${{ inputs.service }} format:check

    - name: TypeScript Check
      run: pnpm --filter ${{ inputs.service }} typecheck

    - name: Import Order Check
      run: pnpm --filter ${{ inputs.service }} lint:imports
```

**Exit Criteria**:
- Zero ESLint errors (warnings allowed with limits)
- All files properly formatted
- No TypeScript compilation errors
- Import order matches convention

### 2.2 Test Stage

**Purpose**: Validate functional correctness with comprehensive test coverage.

```yaml
test:
  runs-on: ubuntu-latest
  timeout-minutes: 15
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    redis:
      image: redis:7
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - uses: actions/checkout@v4

    - name: Setup Environment
      uses: ./.github/actions/setup-node-pnpm

    - name: Unit Tests
      run: pnpm --filter ${{ inputs.service }} test:unit --coverage
      env:
        CI: true

    - name: Integration Tests
      run: pnpm --filter ${{ inputs.service }} test:integration
      env:
        DATABASE_URL: postgres://postgres:test@localhost:5432/test
        REDIS_URL: redis://localhost:6379

    - name: Upload Coverage
      uses: codecov/codecov-action@v4
      with:
        files: ./coverage/lcov.info
        flags: ${{ inputs.service }}

    - name: Coverage Gate
      run: |
        COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
        if (( $(echo "$COVERAGE < 80" | bc -l) )); then
          echo "Coverage $COVERAGE% is below 80% threshold"
          exit 1
        fi
```

**Exit Criteria**:
- All unit tests pass
- All integration tests pass
- Code coverage ≥ 80% lines
- No flaky test failures (retry once)

### 2.3 Security Stage

**Purpose**: Identify vulnerabilities, secrets, and supply chain risks.

```yaml
security:
  runs-on: ubuntu-latest
  timeout-minutes: 15
  permissions:
    security-events: write
    contents: read

  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Full history for secret scanning

    # SAST - Static Application Security Testing
    - name: CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        languages: javascript,typescript

    # Secret Scanning
    - name: Gitleaks
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    # Dependency Vulnerabilities
    - name: Dependency Audit
      run: pnpm audit --audit-level=high

    # Container Scanning (if Dockerfile exists)
    - name: Build Container for Scanning
      if: hashFiles('**/Dockerfile') != ''
      run: docker build -t ${{ inputs.service }}:scan .

    - name: Trivy Container Scan
      if: hashFiles('**/Dockerfile') != ''
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: '${{ inputs.service }}:scan'
        format: 'sarif'
        output: 'trivy-results.sarif'
        severity: 'CRITICAL,HIGH'
        exit-code: '1'

    - name: Upload Trivy Results
      uses: github/codeql-action/upload-sarif@v3
      if: always()
      with:
        sarif_file: 'trivy-results.sarif'

    # License Compliance
    - name: License Check
      run: |
        pnpm dlx license-checker --production --failOn "GPL;AGPL"
```

**Exit Criteria**:
- No critical/high CVEs in dependencies
- No secrets detected in code or history
- No high-severity SAST findings
- License compliance verified

### 2.4 Build Stage

**Purpose**: Create reproducible, signed container images.

```yaml
build:
  runs-on: ubuntu-latest
  timeout-minutes: 15
  outputs:
    image: ${{ steps.build.outputs.image }}
    digest: ${{ steps.build.outputs.digest }}

  steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ vars.REGISTRY }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - name: Extract Metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ vars.REGISTRY }}/${{ inputs.service }}
        tags: |
          type=sha,prefix=
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}

    - name: Build and Push
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        provenance: true
        sbom: true

    - name: Generate SBOM
      uses: anchore/sbom-action@v0
      with:
        image: ${{ vars.REGISTRY }}/${{ inputs.service }}@${{ steps.build.outputs.digest }}
        output-file: sbom.spdx.json

    - name: Sign Image
      uses: sigstore/cosign-installer@v3

    - name: Sign with Cosign
      run: |
        cosign sign --yes \
          ${{ vars.REGISTRY }}/${{ inputs.service }}@${{ steps.build.outputs.digest }}
      env:
        COSIGN_EXPERIMENTAL: 1

    - name: Attest SBOM
      run: |
        cosign attest --yes --predicate sbom.spdx.json \
          ${{ vars.REGISTRY }}/${{ inputs.service }}@${{ steps.build.outputs.digest }}
```

**Exit Criteria**:
- Image builds successfully
- Image pushed to registry
- SBOM generated and attached
- Image signed with Cosign
- Provenance attestation created

### 2.5 Deploy Stage

**Purpose**: Deploy to target environment with policy validation.

```yaml
deploy:
  runs-on: ubuntu-latest
  timeout-minutes: 10
  environment: ${{ inputs.environment }}

  steps:
    - uses: actions/checkout@v4

    - name: Setup Kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure Kubeconfig
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Verify Image Signature
      run: |
        cosign verify \
          --certificate-identity-regexp=".*@company.com" \
          --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
          ${{ needs.build.outputs.image }}@${{ needs.build.outputs.digest }}

    - name: Policy Gate - OPA
      run: |
        # Validate deployment against OPA policies
        opa eval --data policies/ --input deploy.json \
          "data.deploy.allow" | jq -e '.result[0].expressions[0].value == true'

    - name: Deploy with Helm
      run: |
        helm upgrade --install ${{ inputs.service }} \
          ./charts/${{ inputs.service }} \
          --namespace ${{ inputs.namespace }} \
          --set image.tag=${{ needs.build.outputs.digest }} \
          --wait \
          --timeout 5m

    - name: Wait for Rollout
      run: |
        kubectl rollout status deployment/${{ inputs.service }} \
          -n ${{ inputs.namespace }} \
          --timeout=300s
```

**Exit Criteria**:
- Image signature verified
- OPA policy gates pass
- Helm deployment succeeds
- Rollout completes within timeout

### 2.6 Verify Stage

**Purpose**: Validate deployment health and basic functionality.

```yaml
verify:
  runs-on: ubuntu-latest
  timeout-minutes: 10
  needs: deploy

  steps:
    - uses: actions/checkout@v4

    - name: Wait for Service Ready
      run: |
        for i in {1..30}; do
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            https://${{ inputs.service }}.${{ inputs.domain }}/health/ready)
          if [ "$STATUS" = "200" ]; then
            echo "Service is ready"
            exit 0
          fi
          sleep 10
        done
        echo "Service failed to become ready"
        exit 1

    - name: Health Check
      run: |
        curl -f https://${{ inputs.service }}.${{ inputs.domain }}/health
        curl -f https://${{ inputs.service }}.${{ inputs.domain }}/health/ready
        curl -f https://${{ inputs.service }}.${{ inputs.domain }}/health/live

    - name: Smoke Tests
      run: |
        pnpm --filter ${{ inputs.service }} test:smoke
      env:
        SERVICE_URL: https://${{ inputs.service }}.${{ inputs.domain }}

    - name: SLO Verification
      run: |
        # Query Prometheus for initial SLO metrics
        AVAILABILITY=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=slo:availability:ratio{service=\"${{ inputs.service }}\"}" | jq '.data.result[0].value[1]')
        if (( $(echo "$AVAILABILITY < 0.999" | bc -l) )); then
          echo "Initial availability $AVAILABILITY below SLO"
          exit 1
        fi

    - name: Performance Baseline
      run: |
        # Quick k6 performance check
        k6 run --vus 10 --duration 30s \
          --out json=results.json \
          tests/performance/baseline.js

        # Verify p99 latency
        P99=$(jq '.metrics.http_req_duration.values["p(99)"]' results.json)
        if (( $(echo "$P99 > 500" | bc -l) )); then
          echo "P99 latency ${P99}ms exceeds 500ms threshold"
          exit 1
        fi
```

**Exit Criteria**:
- All health endpoints respond 200
- Smoke tests pass
- Initial SLO metrics within bounds
- Performance baseline acceptable

### 2.7 Promote Stage

**Purpose**: Progressive rollout with automatic rollback capability.

```yaml
promote:
  runs-on: ubuntu-latest
  timeout-minutes: 30
  needs: verify
  if: inputs.environment == 'production'

  steps:
    - uses: actions/checkout@v4

    - name: Configure Argo Rollouts
      run: |
        kubectl argo rollouts set image ${{ inputs.service }} \
          ${{ inputs.service }}=${{ needs.build.outputs.image }}@${{ needs.build.outputs.digest }} \
          -n production

    - name: Monitor Canary (10%)
      run: |
        # Wait for canary phase
        kubectl argo rollouts status ${{ inputs.service }} \
          -n production \
          --watch \
          --timeout 10m

    - name: Canary Analysis
      run: |
        # Check error rate during canary
        ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=sum(rate(http_requests_total{service=\"${{ inputs.service }}\",code=~\"5..\"}[5m]))/sum(rate(http_requests_total{service=\"${{ inputs.service }}\"}[5m]))" | jq '.data.result[0].value[1]')

        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
          echo "Error rate $ERROR_RATE exceeds 1% threshold, triggering rollback"
          kubectl argo rollouts abort ${{ inputs.service }} -n production
          exit 1
        fi

    - name: Promote to 50%
      run: |
        kubectl argo rollouts promote ${{ inputs.service }} -n production
        sleep 300  # 5 minute bake time

    - name: Full Promotion
      run: |
        kubectl argo rollouts promote ${{ inputs.service }} -n production --full

    - name: Verify Full Rollout
      run: |
        kubectl argo rollouts status ${{ inputs.service }} \
          -n production \
          --watch \
          --timeout 10m
```

**Rollout Strategy**:
```yaml
# Argo Rollouts configuration
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 50
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 100
      analysis:
        successfulRunHistoryLimit: 3
        unsuccessfulRunHistoryLimit: 3
```

### 2.8 Monitor Stage

**Purpose**: Continuous post-deployment observability and alerting.

```yaml
monitor:
  runs-on: ubuntu-latest
  needs: promote
  timeout-minutes: 60

  steps:
    - name: SLO Dashboard Update
      run: |
        # Update Grafana annotations for deployment
        curl -X POST "$GRAFANA_URL/api/annotations" \
          -H "Authorization: Bearer ${{ secrets.GRAFANA_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{
            "dashboardUID": "${{ inputs.service }}-slo",
            "time": '$(($(date +%s) * 1000))',
            "text": "Deployed ${{ github.sha }}",
            "tags": ["deployment"]
          }'

    - name: Error Budget Check
      run: |
        # Calculate error budget consumption
        BUDGET_REMAINING=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=slo:error_budget_remaining:ratio{service=\"${{ inputs.service }}\"}" | jq '.data.result[0].value[1]')

        echo "Error budget remaining: $BUDGET_REMAINING"

        if (( $(echo "$BUDGET_REMAINING < 0.25" | bc -l) )); then
          echo "::warning::Error budget below 25%, consider deployment freeze"
        fi

    - name: Post-Deploy Soak Test
      run: |
        # 30-minute soak test
        k6 run --vus 50 --duration 30m \
          --out influxdb=$INFLUXDB_URL \
          tests/performance/soak.js

    - name: Create Deployment Record
      run: |
        # Record deployment in audit ledger
        curl -X POST "$AUDIT_LEDGER_URL/deployments" \
          -H "Authorization: Bearer ${{ secrets.AUDIT_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{
            "service": "${{ inputs.service }}",
            "version": "${{ github.sha }}",
            "environment": "${{ inputs.environment }}",
            "deployer": "${{ github.actor }}",
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "status": "success"
          }'
```

---

## 3. Policy Gates

### 3.1 Required Gates (Cannot Bypass)

| Gate | Stage | Enforcement |
|------|-------|-------------|
| **Secret Detection** | Security | Blocks merge if secrets found |
| **Critical CVE** | Security | Blocks deploy if critical CVE |
| **Image Signature** | Deploy | Rejects unsigned images |
| **OPA Policy** | Deploy | Validates against Rego policies |
| **Health Check** | Verify | Fails deployment if unhealthy |

### 3.2 Conditional Gates (Tier-Based)

| Gate | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Coverage Threshold** | 90% | 80% | 70% |
| **Canary Analysis** | Required | Required | Optional |
| **Soak Test** | 30 min | 15 min | Skip |
| **Manual Approval** | Required | Optional | Skip |

### 3.3 OPA Policy Examples

```rego
# policies/deploy.rego
package deploy

default allow = false

# Require signed images
allow {
  input.image.signed == true
  input.image.signer == "github-actions"
}

# Block deployments during freeze
deny[msg] {
  data.freeze.active == true
  not input.override.freeze_bypass
  msg := "Deployment freeze is active"
}

# Require approval for production tier-1
require_approval {
  input.environment == "production"
  input.service.tier == 1
}

# Block if error budget exhausted
deny[msg] {
  input.slo.error_budget_remaining < 0
  msg := sprintf("Error budget exhausted: %v", [input.slo.error_budget_remaining])
}

# Require rollback plan for breaking changes
deny[msg] {
  input.changes.breaking == true
  not input.rollback_plan
  msg := "Breaking changes require rollback plan"
}
```

---

## 4. Rollback Strategies

### 4.1 Automatic Rollback Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Error Rate Spike | > 5% for 2 min | Immediate rollback |
| Latency Degradation | p99 > 2x baseline for 5 min | Automatic rollback |
| Health Check Failure | 3 consecutive failures | Pod restart, then rollback |
| SLO Burn Rate | > 10x for 5 min | Alert + manual decision |

### 4.2 Rollback Commands

```bash
# Argo Rollouts rollback
kubectl argo rollouts undo <service> -n <namespace>

# Helm rollback
helm rollback <service> <revision> -n <namespace>

# Emergency rollback (direct image change)
kubectl set image deployment/<service> \
  <container>=<previous-image> \
  -n <namespace>
```

### 4.3 Rollback Automation

```yaml
# analysis-template.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.95
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service}}", code!~"5.."}[5m])) /
            sum(rate(http_requests_total{service="{{args.service}}"}[5m]))
```

---

## 5. Opt-In / Opt-Out Model

### 5.1 Default Opt-In

All services created via the scaffold CLI automatically include:

```yaml
# .github/workflows/ci.yml (auto-generated)
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  pipeline:
    uses: ./.github/workflows/_golden-path-pipeline.yml
    with:
      service: ${{ github.event.repository.name }}
    secrets: inherit
```

### 5.2 Opt-Out Process

To opt-out of specific gates, teams must:

1. **File Exception Request** in `EXCEPTIONS.md`:

```markdown
## Exception: [Service Name]

### Requested By
- Team: Platform Team
- Approver: @security-lead
- Date: 2024-01-15

### Exception Type
- [ ] Skip coverage gate
- [x] Reduce canary duration
- [ ] Skip soak test
- [ ] Custom rollout strategy

### Justification
Service handles only internal traffic with no user-facing SLOs.
Reduced canary duration acceptable due to low traffic volume.

### Compensating Controls
- Extended monitoring period (2 hours)
- Manual verification checklist
- Rollback runbook documented

### Expiration
2024-04-15 (90 days)
```

2. **Approval Required**:
   - Security team for security-related exceptions
   - SRE team for SLO-related exceptions
   - Architecture council for structural exceptions

3. **Implement Override**:

```yaml
# .github/workflows/ci.yml
jobs:
  pipeline:
    uses: ./.github/workflows/_golden-path-pipeline.yml
    with:
      service: ${{ github.event.repository.name }}
      skip_soak_test: true  # Exception: EXCEPTIONS.md#service-name
      canary_duration: 2m   # Exception: EXCEPTIONS.md#service-name
    secrets: inherit
```

### 5.3 Exception Monitoring

```rego
# policies/exceptions.rego
package exceptions

# Track active exceptions
active_exceptions[exception] {
  exception := data.exceptions[_]
  time.now_ns() < exception.expiration_ns
}

# Alert on expiring exceptions
expiring_soon[exception] {
  exception := active_exceptions[_]
  days_remaining := (exception.expiration_ns - time.now_ns()) / (24 * 60 * 60 * 1000000000)
  days_remaining < 14
}

# Deny if exception expired
deny[msg] {
  input.exception_id
  exception := data.exceptions[input.exception_id]
  time.now_ns() > exception.expiration_ns
  msg := sprintf("Exception %v has expired", [input.exception_id])
}
```

---

## 6. Reusable Workflow Templates

### 6.1 Main Pipeline Template

```yaml
# .github/workflows/_golden-path-pipeline.yml
name: Golden Path Pipeline

on:
  workflow_call:
    inputs:
      service:
        required: true
        type: string
      environment:
        required: false
        type: string
        default: staging
      skip_security:
        required: false
        type: boolean
        default: false
      skip_soak_test:
        required: false
        type: boolean
        default: false
      canary_duration:
        required: false
        type: string
        default: 5m

jobs:
  lint:
    uses: ./.github/workflows/_lint.yml
    with:
      service: ${{ inputs.service }}

  test:
    uses: ./.github/workflows/_test.yml
    with:
      service: ${{ inputs.service }}

  security:
    if: ${{ !inputs.skip_security }}
    uses: ./.github/workflows/_security.yml
    with:
      service: ${{ inputs.service }}

  build:
    needs: [lint, test, security]
    if: always() && !contains(needs.*.result, 'failure')
    uses: ./.github/workflows/_build.yml
    with:
      service: ${{ inputs.service }}
    secrets: inherit

  deploy:
    needs: build
    uses: ./.github/workflows/_deploy.yml
    with:
      service: ${{ inputs.service }}
      environment: ${{ inputs.environment }}
      image: ${{ needs.build.outputs.image }}
      digest: ${{ needs.build.outputs.digest }}
    secrets: inherit

  verify:
    needs: deploy
    uses: ./.github/workflows/_verify.yml
    with:
      service: ${{ inputs.service }}
      environment: ${{ inputs.environment }}

  promote:
    needs: verify
    if: inputs.environment == 'production'
    uses: ./.github/workflows/_promote.yml
    with:
      service: ${{ inputs.service }}
      canary_duration: ${{ inputs.canary_duration }}
    secrets: inherit
```

---

## 7. Metrics and Dashboards

### 7.1 Pipeline Metrics

| Metric | Description |
|--------|-------------|
| `cicd_pipeline_duration_seconds` | Total pipeline duration |
| `cicd_stage_duration_seconds` | Per-stage duration |
| `cicd_deployments_total` | Deployment count by status |
| `cicd_rollbacks_total` | Rollback count by trigger |
| `cicd_policy_violations_total` | Policy gate violations |

### 7.2 Pipeline Dashboard

```json
{
  "title": "Golden Path CI/CD",
  "panels": [
    {
      "title": "Deployment Frequency",
      "type": "stat",
      "targets": [{
        "expr": "sum(increase(cicd_deployments_total{status=\"success\"}[7d]))"
      }]
    },
    {
      "title": "Lead Time for Changes",
      "type": "gauge",
      "targets": [{
        "expr": "histogram_quantile(0.50, sum(rate(cicd_pipeline_duration_seconds_bucket[7d])) by (le))"
      }]
    },
    {
      "title": "Change Failure Rate",
      "type": "stat",
      "targets": [{
        "expr": "sum(cicd_rollbacks_total) / sum(cicd_deployments_total)"
      }]
    },
    {
      "title": "Mean Time to Recovery",
      "type": "stat",
      "targets": [{
        "expr": "avg(cicd_recovery_duration_seconds)"
      }]
    }
  ]
}
```

---

## Related Documents

- [Platform Blueprint](./PLATFORM_BLUEPRINT.md)
- [Scaffolding Templates](./SCAFFOLDING_TEMPLATES.md)
- [Service Onboarding Checklist](./ONBOARDING_CHECKLIST.md)
