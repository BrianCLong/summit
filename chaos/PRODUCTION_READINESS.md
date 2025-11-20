# ✅ Resilience Lab - Production Readiness Checklist

This checklist ensures your Resilience Lab deployment is production-ready, secure, and reliable.

## Pre-Deployment Checklist

### 1. Environment Validation

- [ ] **Dependencies Installed**
  ```bash
  # Verify all required dependencies
  command -v docker && echo "✓ Docker"
  command -v docker-compose && echo "✓ Docker Compose"
  command -v jq && echo "✓ jq"
  command -v curl && echo "✓ curl"
  command -v bc && echo "✓ bc"
  ```

- [ ] **Docker Running**
  ```bash
  docker info >/dev/null 2>&1 && echo "✓ Docker daemon running"
  ```

- [ ] **Kubernetes Access** (if using k8s target)
  ```bash
  kubectl cluster-info && echo "✓ Kubernetes accessible"
  kubectl auth can-i create pods --namespace=default && echo "✓ Pod permissions"
  ```

- [ ] **File Permissions**
  ```bash
  ls -l chaos/runner.sh | grep -q "x" && echo "✓ Runner executable"
  ls -l chaos/slo-validator.sh | grep -q "x" && echo "✓ SLO validator executable"
  [ -w artifacts/chaos/reports ] && echo "✓ Reports directory writable"
  ```

### 2. Configuration Validation

- [ ] **Scenarios File Valid**
  ```bash
  grep -q "^scenarios:" chaos/scenarios.yaml && echo "✓ Scenarios file valid"
  grep -q "^smoke_suite:" chaos/scenarios.yaml && echo "✓ Smoke suite defined"
  grep -q "^slos:" chaos/scenarios.yaml && echo "✓ SLOs defined"
  ```

- [ ] **Health Check Endpoints Configured**
  ```bash
  # Verify health check endpoint is accessible
  curl -f http://localhost:4000/health && echo "✓ Health endpoint accessible"
  ```

- [ ] **SLO Targets Reviewed**
  ```yaml
  # In chaos/scenarios.yaml, verify:
  slos:
    recovery_time_seconds: 30      # Realistic for your system?
    max_error_rate_percent: 5      # Acceptable threshold?
    min_availability_percent: 95   # Achievable target?
  ```

- [ ] **Compose Stack Configuration**
  ```bash
  # Verify compose files exist
  [ -f compose/docker-compose.yml ] && echo "✓ Base compose file"
  [ -f compose/docker-compose.chaos.yml ] && echo "✓ Chaos compose file"
  ```

### 3. Security Review

- [ ] **No Hardcoded Secrets**
  ```bash
  # Check for hardcoded secrets
  grep -r "password\|secret\|key" chaos/ | grep -v ".md" | grep -v "example"
  # Should return nothing sensitive
  ```

- [ ] **Network Segmentation** (for production)
  - [ ] Chaos tests run in isolated network
  - [ ] Cannot affect production databases directly
  - [ ] Uses staging/test databases only

- [ ] **Resource Limits**
  ```yaml
  # In compose/docker-compose.chaos.yml, verify:
  services:
    postgres:
      deploy:
        resources:
          limits:
            cpus: '2'
            memory: 2G
  ```

- [ ] **RBAC Configured** (for Kubernetes)
  ```bash
  kubectl get serviceaccount chaos-service-account -n default
  kubectl get role chaos-role -n default
  kubectl get rolebinding chaos-role-binding -n default
  ```

### 4. Monitoring & Observability

- [ ] **Prometheus Available**
  ```bash
  curl -f http://localhost:9090/-/healthy && echo "✓ Prometheus healthy"
  ```

- [ ] **Grafana Configured**
  ```bash
  curl -f http://localhost:3001/api/health && echo "✓ Grafana healthy"
  ```

- [ ] **Alert Rules Deployed**
  ```bash
  # Check if chaos alert rules are loaded
  curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.name | contains("Chaos"))'
  ```

- [ ] **Dashboards Imported**
  - [ ] Chaos Engineering dashboard exists in Grafana
  - [ ] Shows chaos experiment status
  - [ ] Shows recovery metrics

### 5. Testing

- [ ] **Unit Tests Pass**
  ```bash
  ./chaos/test-runner.sh && echo "✓ All unit tests passed"
  ```

- [ ] **Dry Run Successful**
  ```bash
  DRY_RUN=true ./chaos/runner.sh --suite smoke_suite && echo "✓ Dry run passed"
  ```

- [ ] **Smoke Suite Passes**
  ```bash
  ./chaos/runner.sh --suite smoke_suite && echo "✓ Smoke suite passed"
  ```

- [ ] **Reports Generated**
  ```bash
  ls -lh artifacts/chaos/reports/ && echo "✓ Reports directory populated"
  ls artifacts/chaos/reports/*.html && echo "✓ HTML reports generated"
  ls artifacts/chaos/reports/*.json && echo "✓ JSON reports generated"
  ```

- [ ] **Recovery Within SLO**
  ```bash
  # Check latest report
  RECOVERY_TIME=$(jq -r '.metrics.recovery_time_seconds' $(ls -t artifacts/chaos/reports/suite_*.json | head -1))
  SLO_TIME=30
  [ "$RECOVERY_TIME" -le "$SLO_TIME" ] && echo "✓ Recovery within SLO"
  ```

## Deployment Checklist

### 1. CI/CD Integration

- [ ] **GitHub Actions Workflow Configured**
  ```yaml
  # .github/workflows/chaos-nightly.yml exists
  # Runs nightly at appropriate time
  # Uploads artifacts
  # Has proper error handling
  ```

- [ ] **Makefile Targets Work**
  ```bash
  make chaos-up && echo "✓ chaos-up works"
  make chaos:smoke && echo "✓ chaos:smoke works"
  make chaos:validate-slos && echo "✓ chaos:validate-slos works"
  make chaos-down && echo "✓ chaos-down works"
  ```

- [ ] **Notification Configured**
  - [ ] Slack/Discord webhook configured (if applicable)
  - [ ] Email notifications set up (if applicable)
  - [ ] PagerDuty integration tested (if applicable)

### 2. Documentation

- [ ] **README Updated**
  - [ ] Installation instructions clear
  - [ ] Usage examples provided
  - [ ] Troubleshooting section complete
  - [ ] Links work

- [ ] **Team Trained**
  - [ ] Team understands chaos engineering principles
  - [ ] Team knows how to interpret reports
  - [ ] Team knows who to contact for issues
  - [ ] Team understands SLO targets

- [ ] **Runbooks Created**
  - [ ] What to do if chaos test fails
  - [ ] How to disable chaos tests (if needed)
  - [ ] How to adjust SLO thresholds
  - [ ] How to add new scenarios

### 3. Operational Readiness

- [ ] **Alerting Rules Reviewed**
  ```bash
  # Verify these alerts exist:
  # - ChaosExperimentFailed
  # - SystemNotRecoveringFromChaos
  # - ChaosImpactTooHigh
  # - HighErrorRateDuringChaos
  ```

- [ ] **On-Call Schedule**
  - [ ] On-call rotation includes chaos test monitoring
  - [ ] Escalation path defined
  - [ ] After-hours support available (if running 24/7)

- [ ] **Rollback Plan**
  - [ ] Can disable chaos tests quickly: `make chaos-down`
  - [ ] Can pause CI chaos runs: disable workflow
  - [ ] Can revert to previous version: documented in MIGRATION.md

- [ ] **Capacity Planning**
  - [ ] Chaos tests don't overwhelm system resources
  - [ ] Report storage has sufficient space
  - [ ] Prometheus has retention for chaos metrics

## Post-Deployment Checklist

### 1. Monitoring (First Week)

- [ ] **Daily Report Review**
  ```bash
  # Check reports daily for first week
  ls -lth artifacts/chaos/reports/ | head -5
  open artifacts/chaos/reports/suite_*.html
  ```

- [ ] **SLO Compliance**
  ```bash
  # Run SLO validator daily
  ./chaos/slo-validator.sh
  ```

- [ ] **Error Rate Trending**
  - [ ] No increase in error rates
  - [ ] Recovery times stable
  - [ ] No unexpected failures

### 2. Fine-Tuning

- [ ] **Adjust Thresholds** (if needed)
  ```yaml
  # If recovery times consistently exceed SLO:
  slos:
    recovery_time_seconds: 35  # Increased from 30
  ```

- [ ] **Schedule Optimization**
  ```yaml
  # Adjust chaos test schedule in CI:
  schedule:
    - cron: '0 3 * * 1-5'  # 3 AM on weekdays
  ```

- [ ] **Scenario Coverage**
  - [ ] All critical paths tested
  - [ ] Database failures covered
  - [ ] Network issues covered
  - [ ] Resource exhaustion covered

### 3. Continuous Improvement

- [ ] **Monthly Review Meeting**
  - [ ] Review chaos test results
  - [ ] Identify patterns/trends
  - [ ] Update scenarios based on incidents
  - [ ] Share learnings with team

- [ ] **Incident Correlation**
  - [ ] Compare chaos failures with real incidents
  - [ ] Add scenarios for new failure modes
  - [ ] Validate that chaos tests would catch real issues

- [ ] **Metrics Tracking**
  ```bash
  # Track these over time:
  # - Average recovery time
  # - SLO compliance rate
  # - Number of scenarios passing
  # - System resilience score
  ```

## Production Environment Specific

### For Docker Compose Deployments

- [ ] **Resource Limits Set**
  ```yaml
  services:
    mc:
      deploy:
        resources:
          limits:
            cpus: '2'
            memory: 4G
  ```

- [ ] **Health Checks Configured**
  ```yaml
  services:
    mc:
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
        interval: 10s
        timeout: 5s
        retries: 3
  ```

- [ ] **Networks Isolated**
  ```yaml
  networks:
    chaos_network:
      driver: bridge
      ipam:
        config:
          - subnet: 172.25.0.0/16
  ```

### For Kubernetes Deployments

- [ ] **Namespace Isolation**
  ```bash
  kubectl get namespace chaos-testing
  # Chaos tests run in dedicated namespace
  ```

- [ ] **Resource Quotas**
  ```yaml
  apiVersion: v1
  kind: ResourceQuota
  metadata:
    name: chaos-quota
    namespace: chaos-testing
  spec:
    hard:
      pods: "10"
      requests.cpu: "4"
      requests.memory: 8Gi
  ```

- [ ] **Network Policies**
  ```yaml
  # Restrict chaos test network access
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: chaos-network-policy
  spec:
    podSelector:
      matchLabels:
        chaos-test: "true"
    policyTypes:
    - Ingress
    - Egress
  ```

- [ ] **Pod Security Policies**
  ```yaml
  # Restrict chaos pod capabilities
  apiVersion: policy/v1beta1
  kind: PodSecurityPolicy
  metadata:
    name: chaos-psp
  spec:
    privileged: false
    allowPrivilegeEscalation: false
  ```

## Compliance & Audit

- [ ] **Audit Log Enabled**
  ```bash
  # Ensure chaos activities are logged
  grep "chaos" /var/log/audit/audit.log
  ```

- [ ] **Change Management**
  - [ ] Chaos scenarios reviewed by change board
  - [ ] Schedule approved by stakeholders
  - [ ] Impact assessment documented

- [ ] **Data Privacy**
  - [ ] No PII in chaos test data
  - [ ] Test databases don't contain production data
  - [ ] Reports don't expose sensitive information

- [ ] **Compliance Requirements**
  - [ ] SOC 2 requirements met (if applicable)
  - [ ] GDPR compliance verified (if applicable)
  - [ ] Industry-specific regulations addressed

## Troubleshooting Readiness

- [ ] **Common Issues Documented**
  - [ ] "Docker not running" → Solution documented
  - [ ] "Lock file exists" → Solution documented
  - [ ] "Recovery timeout" → Solution documented
  - [ ] "Dependencies missing" → Solution documented

- [ ] **Debug Tools Available**
  ```bash
  # Verbose mode for debugging
  ./chaos/runner.sh --verbose

  # Check runner version
  grep "runner_version" chaos/runner.sh

  # View recent logs
  ls -lth artifacts/chaos/reports/ | head -3
  ```

- [ ] **Support Contacts**
  - [ ] Primary contact: _______________
  - [ ] Secondary contact: _______________
  - [ ] Escalation contact: _______________
  - [ ] Vendor support (if applicable): _______________

## Sign-Off

### Development Team
- [ ] Chaos scenarios tested and validated
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Documentation reviewed

**Signed:** _______________ **Date:** _______________

### Operations Team
- [ ] Monitoring configured
- [ ] Alerting rules deployed
- [ ] Runbooks created
- [ ] On-call schedule updated

**Signed:** _______________ **Date:** _______________

### Security Team
- [ ] Security review completed
- [ ] No sensitive data exposed
- [ ] Access controls verified
- [ ] Compliance requirements met

**Signed:** _______________ **Date:** _______________

### Management
- [ ] Business impact assessed
- [ ] Resources allocated
- [ ] Schedule approved
- [ ] Budget approved (if applicable)

**Signed:** _______________ **Date:** _______________

## Post-Launch Success Criteria

After 30 days in production, verify:

- [ ] **Zero Security Incidents** related to chaos testing
- [ ] **>95% SLO Compliance** across all scenarios
- [ ] **<5 mins Mean Time to Recover** from chaos events
- [ ] **Zero Production Outages** caused by chaos tests
- [ ] **100% Report Generation** success rate
- [ ] **Team Confidence** in chaos testing process

## Quarterly Review

Every 90 days, review and update:

- [ ] Scenario relevance
- [ ] SLO targets
- [ ] Schedule optimization
- [ ] Tool updates
- [ ] Documentation accuracy
- [ ] Team training needs

---

## Final Pre-Production Command

Run this comprehensive validation before going to production:

```bash
#!/bin/bash
# Production Readiness Validation Script

echo "🔍 Running Production Readiness Checks..."

# 1. Check dependencies
echo "Checking dependencies..."
./chaos/runner.sh --help >/dev/null 2>&1 || { echo "❌ Runner not working"; exit 1; }
echo "✓ Runner operational"

# 2. Run unit tests
echo "Running unit tests..."
./chaos/test-runner.sh || { echo "❌ Unit tests failed"; exit 1; }
echo "✓ Unit tests passed"

# 3. Run dry-run
echo "Running dry-run..."
DRY_RUN=true ./chaos/runner.sh --suite smoke_suite || { echo "❌ Dry run failed"; exit 1; }
echo "✓ Dry run passed"

# 4. Validate configuration
echo "Validating configuration..."
[ -f chaos/scenarios.yaml ] || { echo "❌ Scenarios file missing"; exit 1; }
echo "✓ Configuration valid"

# 5. Check monitoring
echo "Checking monitoring..."
curl -sf http://localhost:9090/-/healthy || echo "⚠️  Prometheus not available"
curl -sf http://localhost:3001/api/health || echo "⚠️  Grafana not available"

# 6. Verify permissions
echo "Verifying permissions..."
[ -x chaos/runner.sh ] || { echo "❌ Runner not executable"; exit 1; }
[ -w artifacts/chaos/reports ] || { echo "❌ Reports dir not writable"; exit 1; }
echo "✓ Permissions correct"

echo ""
echo "✅ Production Readiness Validation Complete!"
echo ""
echo "You are ready to deploy to production. 🚀"
```

Save this script as `chaos/production-check.sh` and run before deployment:

```bash
chmod +x chaos/production-check.sh
./chaos/production-check.sh
```

## Support

If any checklist item cannot be completed, document the reason and mitigation plan before proceeding to production.

For questions or assistance, refer to:
- [README.md](README.md) - Main documentation
- [MIGRATION.md](MIGRATION.md) - Migration guide
- [QUICK_START.md](QUICK_START.md) - Quick start guide

**Remember:** Chaos engineering in production requires careful planning, proper isolation, and robust monitoring. Never skip safety checks!
