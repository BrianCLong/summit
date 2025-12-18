# CompanyOS Deployment Pipeline

> **Version**: 0.1.0
> **Last Updated**: 2025-12-06

This document describes the end-to-end deployment pipeline for CompanyOS services.

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPANYOS DEPLOYMENT PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │  COMMIT  │──▶│  BUILD   │──▶│   TEST   │──▶│ SECURITY │──▶│  STAGE   │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│       │              │              │              │              │         │
│       ▼              ▼              ▼              ▼              ▼         │
│   • Lint         • Compile      • Unit        • CVE Scan     • Deploy      │
│   • Format       • TypeCheck    • Integration • Secrets      • Smoke       │
│   • Commit       • Bundle       • E2E         • SLSA         • Validate    │
│     Lint         • Docker       • Golden Path • Sign                       │
│                                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │   GATE   │──▶│  CANARY  │──▶│ PROMOTE  │──▶│  VERIFY  │──▶│ COMPLETE │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│       │              │              │              │              │         │
│       ▼              ▼              ▼              ▼              ▼         │
│   • OPA Policy   • 1% Traffic  • 10% → 25%   • Health       • Notify      │
│   • SLO Check    • Smoke Test  • 50% → 100%  • SLO          • Cleanup     │
│   • Budget       • Analysis    • Analysis    • Synthetic    • Document    │
│   • Window                                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Commit Stage

**Trigger**: Push to feature branch or PR creation

**Duration**: ~2 minutes

### Steps

```yaml
commit-stage:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 9

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Lint
      run: pnpm lint

    - name: Format check
      run: pnpm format:check

    - name: Commit lint
      run: |
        echo "${{ github.event.head_commit.message }}" | npx commitlint
```

### Exit Criteria

- All linting passes
- Code formatting verified
- Commit message follows conventional commits

---

## Stage 2: Build Stage

**Trigger**: Commit stage passes

**Duration**: ~5 minutes

### Steps

```yaml
build-stage:
  needs: commit-stage
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup environment
      uses: ./.github/actions/setup-node-pnpm

    - name: TypeScript check
      run: pnpm typecheck

    - name: Build packages
      run: pnpm build

    - name: Build Docker image
      run: |
        docker build \
          --tag ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }} \
          --tag ghcr.io/brianclong/summit/${{ inputs.service }}:latest \
          --build-arg VERSION=${{ github.sha }} \
          --file apps/${{ inputs.service }}/Dockerfile \
          .

    - name: Push to registry
      run: |
        echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
        docker push ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }}
```

### Artifacts Produced

- Compiled TypeScript
- Bundled applications
- Docker images (tagged with SHA)

---

## Stage 3: Test Stage

**Trigger**: Build stage passes

**Duration**: ~10 minutes

### Steps

```yaml
test-stage:
  needs: build-stage
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: test
    redis:
      image: redis:7
    neo4j:
      image: neo4j:5
      env:
        NEO4J_AUTH: neo4j/testpassword

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup environment
      uses: ./.github/actions/setup-node-pnpm

    - name: Unit tests
      run: pnpm test:jest --coverage
      env:
        CI: true

    - name: Upload coverage
      uses: codecov/codecov-action@v3

    - name: Integration tests
      run: pnpm test:integration

    - name: E2E tests
      if: contains(github.event.pull_request.labels.*.name, 'e2e') || github.ref == 'refs/heads/main'
      run: pnpm e2e

    - name: Golden path smoke test
      run: |
        docker-compose -f docker-compose.dev.yml up -d
        ./scripts/wait-for-stack.sh
        make smoke
```

### Coverage Requirements

| Service Tier | Minimum Coverage |
|--------------|------------------|
| Tier 1 | 80% |
| Tier 2 | 70% |
| Tier 3 | 60% |

---

## Stage 4: Security Stage

**Trigger**: Test stage passes

**Duration**: ~5 minutes

### Steps

```yaml
security-stage:
  needs: test-stage
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'
        severity: 'CRITICAL,HIGH'

    - name: Check for critical vulnerabilities
      run: |
        CRITICAL=$(jq '.runs[0].results | map(select(.level == "error")) | length' trivy-results.sarif)
        if [ "$CRITICAL" -gt 0 ]; then
          echo "::error::$CRITICAL critical vulnerabilities found"
          exit 1
        fi

    - name: Gitleaks secret scan
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    - name: Sign container image
      uses: sigstore/cosign-installer@v3

    - name: Sign image
      run: |
        cosign sign --yes \
          ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }}

    - name: Generate SLSA provenance
      uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v1.9.0
      with:
        image: ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }}

    - name: Generate SBOM
      run: |
        syft ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }} \
          -o spdx-json > sbom.spdx.json

    - name: Attest SBOM
      run: |
        cosign attest --yes --predicate sbom.spdx.json \
          ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }}
```

### Security Requirements

| Check | Production | Staging | Development |
|-------|------------|---------|-------------|
| Critical CVEs | 0 | 0 | 0 |
| High CVEs | 0 | ≤5 | ≤10 |
| Secrets | 0 | 0 | 0 |
| Image signed | Required | Required | Optional |
| SLSA level | ≥3 | ≥2 | ≥1 |

---

## Stage 5: Staging Deployment

**Trigger**: Security stage passes, PR merged to main

**Duration**: ~10 minutes

### Steps

```yaml
staging-deploy:
  needs: security-stage
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  environment: staging
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.STAGING_KUBECONFIG }}

    - name: Deploy to staging
      run: |
        helm upgrade --install ${{ inputs.service }} \
          ./helm/${{ inputs.service }} \
          --namespace staging \
          --values ./helm/${{ inputs.service }}/values-staging.yaml \
          --set image.tag=${{ github.sha }} \
          --wait --timeout 5m

    - name: Run staging smoke tests
      run: |
        kubectl run smoke-test --rm -i --restart=Never \
          --image=ghcr.io/brianclong/summit/smoke-runner:latest \
          --env="TARGET_URL=http://${{ inputs.service }}.staging:4000" \
          -- /app/smoke-test.sh

    - name: Validate staging health
      run: |
        for i in {1..30}; do
          if kubectl exec -n staging deploy/${{ inputs.service }} -- \
            curl -sf http://localhost:4000/health; then
            echo "Staging deployment healthy"
            exit 0
          fi
          sleep 10
        done
        echo "Staging deployment unhealthy"
        exit 1
```

---

## Stage 6: Release Gate

**Trigger**: Staging validation passes

**Duration**: ~1 minute

### Steps

```yaml
release-gate:
  needs: staging-deploy
  runs-on: ubuntu-latest
  outputs:
    approved: ${{ steps.gate.outputs.approved }}
    strategy: ${{ steps.gate.outputs.strategy }}
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Gather gate inputs
      id: gather
      run: |
        # Collect all gate information
        cat > gate-input.json << EOF
        {
          "service": "${{ inputs.service }}",
          "version": "${{ github.sha }}",
          "environment": "production",
          "image": "ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }}",
          "gates": {
            "build": {
              "typescript": "pass",
              "compile": "pass",
              "lint": "pass",
              "format": "pass"
            },
            "quality": {
              "unit_tests": "pass",
              "coverage": ${{ needs.test-stage.outputs.coverage }},
              "integration_tests": "pass",
              "golden_path": "pass"
            },
            "security": {
              "critical_cves": 0,
              "high_cves": 0,
              "secrets_found": 0,
              "image_signed": true,
              "slsa_level": 3
            }
          },
          "slo": {
            "error_budget_remaining": $(curl -s http://prometheus:9090/api/v1/query?query=slo:error_budget_remaining:ratio | jq '.data.result[0].value[1] * 100'),
            "fast_burn_rate": $(curl -s http://prometheus:9090/api/v1/query?query=slo:error_budget_burn_rate:fast | jq '.data.result[0].value[1]'),
            "slow_burn_rate": $(curl -s http://prometheus:9090/api/v1/query?query=slo:error_budget_burn_rate:slow | jq '.data.result[0].value[1]'),
            "active_p1_incidents": 0,
            "active_p2_incidents": 0,
            "rollbacks_last_24h": 0
          },
          "emergency_override": false
        }
        EOF

    - name: Evaluate release gate
      id: gate
      run: |
        DECISION=$(opa eval -d docs/release-reliability/policies/release_gate.rego \
          -i gate-input.json \
          "data.companyos.release.decision" \
          --format=json)

        APPROVED=$(echo $DECISION | jq -r '.result[0].expressions[0].value.allow')
        STRATEGY=$(echo $DECISION | jq -r '.result[0].expressions[0].value.strategy')
        VIOLATIONS=$(echo $DECISION | jq -r '.result[0].expressions[0].value.violations | join(", ")')

        if [ "$APPROVED" != "true" ]; then
          echo "::error::Release gate denied: $VIOLATIONS"
          exit 1
        fi

        echo "approved=$APPROVED" >> $GITHUB_OUTPUT
        echo "strategy=$STRATEGY" >> $GITHUB_OUTPUT

    - name: Check deployment window
      run: |
        HOUR=$(date +%H)
        DAY=$(date +%A)

        if [[ "$DAY" =~ ^(Saturday|Sunday)$ ]]; then
          echo "::error::Deployment blocked - weekend"
          exit 1
        fi

        if [[ "$DAY" == "Friday" && $HOUR -ge 12 ]]; then
          echo "::error::Deployment blocked - Friday afternoon"
          exit 1
        fi

        if [[ $HOUR -lt 9 || $HOUR -ge 16 ]]; then
          echo "::error::Deployment blocked - outside hours (09:00-16:00)"
          exit 1
        fi
```

---

## Stage 7: Production Canary

**Trigger**: Release gate passes

**Duration**: 30-45 minutes (Tier 1), 10-15 minutes (Tier 2)

### Steps

```yaml
production-canary:
  needs: release-gate
  if: needs.release-gate.outputs.approved == 'true'
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.PRODUCTION_KUBECONFIG }}

    - name: Notify deployment start
      uses: slackapi/slack-github-action@v1
      with:
        channel-id: 'deployments'
        slack-message: |
          :rocket: Starting production deployment
          Service: ${{ inputs.service }}
          Version: ${{ github.sha }}
          Strategy: ${{ needs.release-gate.outputs.strategy }}

    - name: Deploy canary
      run: |
        kubectl argo rollouts set image ${{ inputs.service }} \
          api=ghcr.io/brianclong/summit/${{ inputs.service }}:${{ github.sha }} \
          -n production

    - name: Wait for canary analysis
      run: |
        kubectl argo rollouts status ${{ inputs.service }} \
          -n production \
          --timeout 45m

    - name: Handle rollout failure
      if: failure()
      run: |
        echo "::error::Canary analysis failed - initiating rollback"
        kubectl argo rollouts abort ${{ inputs.service }} -n production
        kubectl argo rollouts undo ${{ inputs.service }} -n production
```

### Canary Analysis Templates

The canary phase uses these analysis templates:

```yaml
# Smoke check - Initial health validation
smoke-check:
  metrics:
    - name: health-endpoint
      successCondition: result == 200
      provider:
        web:
          url: http://{{ args.service }}.production:4000/health

# SLO burn check - Error budget consumption
slo-burn-check:
  metrics:
    - name: error-rate
      successCondition: result < 0.02
      provider:
        prometheus:
          query: sum(rate(http_requests_total{service="{{ args.service }}",code=~"5.."}[5m])) / sum(rate(http_requests_total{service="{{ args.service }}"}[5m]))

    - name: latency-p95
      successCondition: result < 0.5
      provider:
        prometheus:
          query: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="{{ args.service }}"}[5m])) by (le))

# Synthetic check - Business logic validation
synthetic-check:
  metrics:
    - name: golden-path
      successCondition: result == "pass"
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: golden-path
                    image: ghcr.io/brianclong/summit/golden-path-runner:latest
                    env:
                      - name: TARGET_SERVICE
                        value: "{{ args.service }}"
```

---

## Stage 8: Production Promotion

**Trigger**: Canary analysis passes

**Duration**: Automatic (handled by Argo Rollouts)

### Traffic Progression

```
Tier 1 Services (Progressive Canary):
──────────────────────────────────────────
Time 0:      [█░░░░░░░░░] 1%  → Smoke check
Time 1m:     [██░░░░░░░░] 10% → SLO burn check
Time 6m:     [███░░░░░░░] 25% → Synthetic check
Time 16m:    [█████░░░░░] 50% → Anomaly check
Time 31m:    [██████████] 100% → Complete

Tier 2 Services (Standard Canary):
──────────────────────────────────────────
Time 0:      [██░░░░░░░░] 10% → Health check
Time 2m:     [█████░░░░░] 50% → SLO burn check
Time 5m:     [██████████] 100% → Complete
```

---

## Stage 9: Post-Deployment Verification

**Trigger**: 100% traffic shifted

**Duration**: ~5 minutes

### Steps

```yaml
post-deployment:
  needs: production-canary
  runs-on: ubuntu-latest
  steps:
    - name: Verify all pods healthy
      run: |
        kubectl get pods -n production -l app=${{ inputs.service }} \
          -o jsonpath='{.items[*].status.phase}' | grep -v Running && exit 1 || true

    - name: Run post-deployment smoke test
      run: |
        ./scripts/post-deployment-validation.sh ${{ inputs.service }}

    - name: Verify SLO health
      run: |
        ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{service=\"${{ inputs.service }}\",code=~\"5..\"}[5m]))/sum(rate(http_requests_total{service=\"${{ inputs.service }}\"}[5m]))" | jq -r '.data.result[0].value[1]')

        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
          echo "::warning::Error rate elevated: $ERROR_RATE"
        fi

    - name: Update deployment record
      run: |
        gh api repos/${{ github.repository }}/deployments \
          -f ref=${{ github.sha }} \
          -f environment=production \
          -f state=success
```

---

## Stage 10: Completion

**Trigger**: Post-deployment verification passes

### Steps

```yaml
completion:
  needs: post-deployment
  runs-on: ubuntu-latest
  steps:
    - name: Notify success
      uses: slackapi/slack-github-action@v1
      with:
        channel-id: 'deployments'
        slack-message: |
          :white_check_mark: Production deployment complete
          Service: ${{ inputs.service }}
          Version: ${{ github.sha }}
          Duration: ${{ steps.duration.outputs.value }}

    - name: Update release notes
      run: |
        gh release create v${{ github.run_number }} \
          --title "Release ${{ github.run_number }}" \
          --notes "Deployed ${{ inputs.service }} version ${{ github.sha }}"

    - name: Clean up old images
      run: |
        # Keep last 10 images
        gh api repos/${{ github.repository }}/packages/container/${{ inputs.service }}/versions \
          --jq '.[10:] | .[].id' | \
          xargs -I {} gh api -X DELETE repos/${{ github.repository }}/packages/container/${{ inputs.service }}/versions/{}
```

---

## Rollback Procedures

### Automatic Rollback

Argo Rollouts automatically rolls back when:
- Analysis template fails
- Health checks fail for 3 consecutive checks
- Error rate exceeds 5%
- Latency p95 exceeds threshold

### Manual Rollback

```bash
# Abort current rollout
kubectl argo rollouts abort <service> -n production

# Rollback to previous version
kubectl argo rollouts undo <service> -n production

# Rollback to specific revision
kubectl argo rollouts undo <service> -n production --to-revision=3

# Verify rollback
kubectl argo rollouts status <service> -n production
```

---

## Monitoring During Deployment

### Key Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Deployment Overview | /d/deployment-overview | Real-time deployment status |
| SLO Burn Rate | /d/slo-burn | Error budget consumption |
| Golden Signals | /d/golden-signals | Latency, errors, traffic |
| Canary Analysis | /d/canary-analysis | Canary vs stable comparison |

### Alerts During Deployment

| Alert | Threshold | Action |
|-------|-----------|--------|
| ErrorRateSpike | >2% for 2m | Investigate |
| ErrorRateCritical | >5% for 1m | Auto-rollback |
| LatencySpike | p95 >500ms for 3m | Investigate |
| CanaryHealthFailing | 3 failures | Auto-rollback |

---

## Pipeline Metrics

Track these metrics to improve the pipeline:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead time | <1 hour | Commit to production |
| Deployment frequency | Daily | Deployments per day |
| Change failure rate | <5% | Rollbacks / deployments |
| MTTR | <30 min | Time to recover from failure |

---

*Pipeline documentation v0.1.0 - Review quarterly*
