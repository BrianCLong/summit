# Pilot Deployment Guide - October 2025

**Purpose**: Step-by-step guide for deploying IntelGraph October 2025 release to pilot customers

**Owner**: Customer Success + SRE
**Status**: Production-Ready
**Release**: 2025.10.HALLOWEEN

---

## Overview

This guide covers deployment of the October 2025 IntelGraph release to pilot customers. The release includes:

- OPA-based release gate with fail-closed enforcement
- WebAuthn step-up authentication for risky operations
- SBOM + SLSA provenance for supply chain integrity
- Comprehensive security scanning (CodeQL, Trivy, Gitleaks)
- SLO dashboards with trace exemplars
- k6 synthetics suite with golden flow validation
- E2E validation with proof artifacts

**Pilot Duration**: 30 days (October 15 - November 15, 2025)

**Pilot Customers**: 3-5 early adopters (TBD)

---

## Prerequisites

### Infrastructure Requirements

**Kubernetes Cluster**:

- Version: 1.28+
- Nodes: 3+ (HA deployment)
- CPU: 16 vCPUs minimum per node
- Memory: 32 GB minimum per node
- Storage: 500 GB SSD (persistent volumes)

**Network Requirements**:

- Ingress controller (NGINX or Traefik)
- TLS certificates (Let's Encrypt or custom CA)
- Public IP for ingress (or LoadBalancer service)
- DNS record for ingress domain

**External Services**:

- PostgreSQL 15+ (for metadata storage)
- Neo4j 5+ Community or Enterprise (for graph storage)
- Kafka 3+ (for event streaming)
- Redis 7+ (for caching)
- Prometheus + Grafana (for observability)
- OPA 0.60+ (for policy enforcement)

**Optional**:

- Tempo (for distributed tracing)
- Alertmanager (for SLO alerts)
- Pushgateway (for metrics)

---

### Access Requirements

**Required Credentials**:

- Kubernetes cluster admin access
- GitHub personal access token (for pulling container images)
- Cloud provider credentials (AWS/GCP/Azure)
- DNS management access
- TLS certificate management access

**Required Permissions**:

- Create/update Kubernetes resources (deployments, services, secrets, configmaps)
- Create persistent volumes
- Configure ingress rules
- Update DNS records

---

### Pre-Deployment Checklist

- [ ] Kubernetes cluster provisioned and accessible
- [ ] kubectl configured with cluster context
- [ ] Helm 3 installed
- [ ] External services (PostgreSQL, Neo4j, Kafka, Redis) provisioned
- [ ] TLS certificates obtained and stored as Kubernetes secrets
- [ ] DNS record created (e.g., `pilot.intelgraph.example.com`)
- [ ] GitHub PAT created with `read:packages` scope
- [ ] Observability stack deployed (Prometheus, Grafana, OPA)
- [ ] Backup/restore procedures tested

---

## Deployment Steps

### Step 1: Verify Release Artifacts

**Download and verify SBOM + provenance**:

```bash
# Set release tag
export RELEASE_TAG="2025.10.HALLOWEEN"

# Download release artifacts
gh release download $RELEASE_TAG \
  --repo BrianCLong/summit \
  --pattern "sbom.*" \
  --pattern "provenance.json" \
  --pattern "checksums.txt"

# Verify checksums
sha256sum -c checksums.txt

# Expected output:
# sbom.json: OK
# sbom.xml: OK
# provenance.json: OK

# Inspect SBOM
cat sbom.json | jq '.components | length'
# Expected: 150+ components

# Inspect provenance
cat provenance.json | jq '.predicate.builder.id'
# Expected: https://github.com/BrianCLong/summit/actions
```

**Verify security scans passed**:

```bash
# Check Code Scanning alerts
gh api repos/BrianCLong/summit/code-scanning/alerts \
  --jq '.[] | select(.state == "open" and .rule.security_severity_level == "critical")'

# Expected: No output (0 critical alerts)

# If critical alerts exist, review SECURITY_WAIVERS.md for approved waivers
cat SECURITY_WAIVERS.md | grep "ACTIVE"
```

---

### Step 2: Configure Deployment Values

**Create `pilot-values.yaml`**:

```yaml
# Global configuration
global:
  environment: pilot
  domain: pilot.intelgraph.example.com
  tlsSecretName: intelgraph-tls

# Application configuration
app:
  image:
    repository: ghcr.io/brianlong/intelgraph
    tag: 2025.10.HALLOWEEN
    pullPolicy: IfNotPresent

  replicas: 3

  resources:
    requests:
      cpu: 2000m
      memory: 4Gi
    limits:
      cpu: 4000m
      memory: 8Gi

  env:
    - name: NODE_ENV
      value: production
    - name: LOG_LEVEL
      value: info
    - name: ENABLE_STEP_UP_AUTH
      value: 'true'
    - name: OPA_URL
      value: http://opa:8181

# PostgreSQL (external)
postgresql:
  enabled: false
  external:
    host: postgresql.example.com
    port: 5432
    database: intelgraph_pilot
    username: intelgraph
    passwordSecret: postgres-credentials
    sslMode: require

# Neo4j (external)
neo4j:
  enabled: false
  external:
    host: neo4j.example.com
    port: 7687
    username: neo4j
    passwordSecret: neo4j-credentials

# Kafka (external)
kafka:
  enabled: false
  external:
    brokers: kafka-1.example.com:9092,kafka-2.example.com:9092,kafka-3.example.com:9092
    saslMechanism: PLAIN
    saslSecret: kafka-credentials

# Redis (external)
redis:
  enabled: false
  external:
    host: redis.example.com
    port: 6379
    passwordSecret: redis-credentials

# OPA (sidecar)
opa:
  enabled: true
  image:
    repository: openpolicyagent/opa
    tag: 0.60.0
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Ingress
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/force-ssl-redirect: 'true'
  hosts:
    - host: pilot.intelgraph.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: intelgraph-tls
      hosts:
        - pilot.intelgraph.example.com

# Observability
observability:
  prometheus:
    enabled: true
    serviceMonitor: true
  grafana:
    enabled: true
    adminPassword: <set-secure-password>
  tempo:
    enabled: true

# Security
security:
  webauthn:
    rpID: pilot.intelgraph.example.com
    rpName: IntelGraph Pilot
    rpOrigin: https://pilot.intelgraph.example.com

  stepUpTimeout: 300 # 5 minutes

  policies:
    releaseGate: true
    webauthnStepUp: true

# Feature flags
features:
  enableWebAuthnStepUp: true
  enableDLPPolicies: true
  enableTraceExemplars: true
  enableK6Synthetics: true
```

---

### Step 3: Create Kubernetes Secrets

**Database credentials**:

```bash
# PostgreSQL
kubectl create secret generic postgres-credentials \
  --from-literal=password=<postgres-password> \
  --namespace intelgraph-pilot

# Neo4j
kubectl create secret generic neo4j-credentials \
  --from-literal=password=<neo4j-password> \
  --namespace intelgraph-pilot

# Kafka SASL
kubectl create secret generic kafka-credentials \
  --from-literal=username=<kafka-username> \
  --from-literal=password=<kafka-password> \
  --namespace intelgraph-pilot

# Redis
kubectl create secret generic redis-credentials \
  --from-literal=password=<redis-password> \
  --namespace intelgraph-pilot
```

**GitHub container registry credentials**:

```bash
# Create GitHub PAT secret for pulling images
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-pat> \
  --namespace intelgraph-pilot
```

**TLS certificates** (if not using cert-manager):

```bash
kubectl create secret tls intelgraph-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace intelgraph-pilot
```

---

### Step 4: Load OPA Policies

**Load policies into OPA ConfigMap**:

```bash
# Create ConfigMap with OPA policies
kubectl create configmap opa-policies \
  --from-file=release_gate.rego=policies/release_gate.rego \
  --from-file=webauthn_stepup.rego=policies/webauthn_stepup.rego \
  --namespace intelgraph-pilot

# Verify policies loaded
kubectl get configmap opa-policies -n intelgraph-pilot -o yaml
```

**Test policies locally** (before deployment):

```bash
# Install OPA CLI
brew install opa

# Test release gate policy
opa eval -d policies/release_gate.rego \
  -i test_inputs/release_gate_allow.json \
  "data.release_gate.allow"
# Expected: true

# Test WebAuthn step-up policy
opa eval -d policies/webauthn_stepup.rego \
  -i test_inputs/webauthn_stepup_deny.json \
  "data.webauthn_stepup.allow"
# Expected: false (deny without step-up)

opa eval -d policies/webauthn_stepup.rego \
  -i test_inputs/webauthn_stepup_allow.json \
  "data.webauthn_stepup.allow"
# Expected: true (allow with step-up)
```

---

### Step 5: Deploy Application

**Deploy using Helm**:

```bash
# Add Helm repository (if using Helm chart)
helm repo add intelgraph https://charts.intelgraph.example.com
helm repo update

# Install IntelGraph
helm install intelgraph-pilot intelgraph/intelgraph \
  --namespace intelgraph-pilot \
  --create-namespace \
  --values pilot-values.yaml \
  --version 2025.10.0 \
  --wait \
  --timeout 10m

# Monitor deployment
kubectl rollout status deployment/intelgraph-pilot -n intelgraph-pilot

# Expected output:
# deployment "intelgraph-pilot" successfully rolled out
```

**Verify deployment**:

```bash
# Check pods
kubectl get pods -n intelgraph-pilot

# Expected output:
# NAME                               READY   STATUS    RESTARTS   AGE
# intelgraph-pilot-xxxxx-yyyyy       2/2     Running   0          2m
# intelgraph-pilot-xxxxx-zzzzz       2/2     Running   0          2m
# intelgraph-pilot-xxxxx-wwwww       2/2     Running   0          2m

# Check services
kubectl get svc -n intelgraph-pilot

# Check ingress
kubectl get ingress -n intelgraph-pilot

# Check logs
kubectl logs -n intelgraph-pilot -l app=intelgraph-pilot -c intelgraph --tail=50
```

---

### Step 6: Run Post-Deployment Validation

**Health checks**:

```bash
# API health
curl https://pilot.intelgraph.example.com/health
# Expected: {"status": "ok", "version": "2025.10.HALLOWEEN"}

# OPA health
kubectl exec -n intelgraph-pilot -it deployment/intelgraph-pilot -c opa -- \
  wget -qO- http://localhost:8181/health
# Expected: {"status": "ok"}

# Database connectivity
kubectl exec -n intelgraph-pilot -it deployment/intelgraph-pilot -c intelgraph -- \
  node -e "const {Client} = require('pg'); const c = new Client(process.env.DATABASE_URL); c.connect().then(() => console.log('OK')).catch(e => console.error(e));"
# Expected: OK

# Neo4j connectivity
kubectl exec -n intelgraph-pilot -it deployment/intelgraph-pilot -c intelgraph -- \
  node -e "const neo4j = require('neo4j-driver'); const d = neo4j.driver(process.env.NEO4J_URL); d.verifyConnectivity().then(() => console.log('OK')).catch(e => console.error(e));"
# Expected: OK
```

**E2E Golden Path Test**:

```bash
# Port-forward to run E2E test
kubectl port-forward -n intelgraph-pilot svc/intelgraph-pilot 3000:80 &

# Set API URL
export API_URL="http://localhost:3000"

# Run E2E test
./scripts/e2e/golden-path.sh

# Expected output:
# ✅ Step 1: Seeding test data... OK
# ✅ Step 2: Executing query... OK
# ✅ Step 3a: Export blocked without step-up (403)... OK
# ✅ Step 3b: Getting step-up token... OK
# ✅ Step 3c: Export allowed with step-up (200)... OK
# ✅ Step 4: Verifying audit logs... OK
# ✅ Step 5: Verifying provenance... OK
# ✅ Step 6: Verifying OPA policy outcomes... OK
#
# All checks passed! E2E validation complete.

# Kill port-forward
kill %1
```

**k6 Synthetics Test**:

```bash
# Install k6
brew install k6

# Set API URL
export API_URL="https://pilot.intelgraph.example.com"
export TEST_USER_EMAIL="pilot@example.com"
export TEST_USER_PASSWORD="$PILOT_USER_PASSWORD"  # Set via environment or secrets

# Run k6 test
k6 run tests/k6/golden-flow.k6.js

# Expected output:
# ✓ login successful
# ✓ query returned results
# ✓ graph rendered
# ✓ export succeeded
#
# checks.........................: 100.00% ✓ 400  ✗ 0
# golden_flow_success............: 100.00% ✓ 100  ✗ 0
# http_req_duration (p95)........: 1.2s
```

---

### Step 7: Configure Observability

**Import Grafana dashboards**:

```bash
# Get Grafana admin credentials
export GRAFANA_PASSWORD=$(kubectl get secret -n intelgraph-pilot grafana-admin -o jsonpath='{.data.password}' | base64 -d)

# Port-forward to Grafana
kubectl port-forward -n intelgraph-pilot svc/grafana 3001:80 &

# Import SLO dashboards
curl -X POST http://admin:$GRAFANA_PASSWORD@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @observability/grafana/slo-core-dashboards.json

# Import dashboard with trace exemplars
curl -X POST http://admin:$GRAFANA_PASSWORD@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @observability/grafana/slo-core-dashboards-with-exemplars.json

# Kill port-forward
kill %1
```

**Configure Prometheus alert rules**:

```bash
# Create ConfigMap with alert rules
kubectl create configmap prometheus-slo-alerts \
  --from-file=slo-alerts.yml=observability/prometheus/alerts/slo-alerts.yml \
  --namespace intelgraph-pilot

# Reload Prometheus config
kubectl exec -n intelgraph-pilot -it statefulset/prometheus -- \
  wget --post-data="" -qO- http://localhost:9090/-/reload
```

**Configure Alertmanager**:

```bash
# Create Secret with Alertmanager config (includes Slack webhook)
kubectl create secret generic alertmanager-config \
  --from-file=alertmanager.yml=observability/prometheus/alertmanager.yml \
  --namespace intelgraph-pilot

# Set Slack webhook URL
kubectl create secret generic slack-webhook \
  --from-literal=url=<slack-webhook-url> \
  --namespace intelgraph-pilot

# Reload Alertmanager
kubectl exec -n intelgraph-pilot -it statefulset/alertmanager -- \
  wget --post-data="" -qO- http://localhost:9093/-/reload
```

**Test alert firing**:

```bash
# Port-forward to Prometheus and Alertmanager
kubectl port-forward -n intelgraph-pilot svc/prometheus 9090:9090 &
kubectl port-forward -n intelgraph-pilot svc/alertmanager 9093:9093 &

# Set environment variables
export PROMETHEUS_URL="http://localhost:9090"
export ALERTMANAGER_URL="http://localhost:9093"
export SLACK_WEBHOOK_URL="<slack-webhook-url>"

# Run alert test
./scripts/test-alert-fire.sh

# Expected output:
# ✅ Alert is FIRING!
# ✅ Alert found in Alertmanager
# ✅ Test Slack notification sent

# Kill port-forwards
kill %1 %2
```

---

### Step 8: Create Pilot Users

**Create WebAuthn-enabled pilot users**:

```bash
# Create pilot admin user
kubectl exec -n intelgraph-pilot -it deployment/intelgraph-pilot -c intelgraph -- \
  node scripts/create-user.js \
    --email pilot-admin@example.com \
    --name "Pilot Admin" \
    --role admin \
    --enable-webauthn

# Create pilot analyst users
for i in {1..5}; do
  kubectl exec -n intelgraph-pilot -it deployment/intelgraph-pilot -c intelgraph -- \
    node scripts/create-user.js \
      --email "pilot-analyst-${i}@example.com" \
      --name "Pilot Analyst ${i}" \
      --role analyst \
      --enable-webauthn
done

# Verify users created
kubectl exec -n intelgraph-pilot -it deployment/intelgraph-pilot -c intelgraph -- \
  psql $DATABASE_URL -c "SELECT email, name, role FROM users WHERE email LIKE 'pilot%';"
```

**Send onboarding emails with WebAuthn setup instructions**:

```bash
# Generate onboarding email template
cat > pilot-onboarding-email.md <<EOF
Subject: Welcome to IntelGraph Pilot Program

Dear Pilot User,

Welcome to the IntelGraph October 2025 pilot program!

**Your Access Details**:
- URL: https://pilot.intelgraph.example.com
- Email: {{EMAIL}}
- Temporary Password: {{TEMP_PASSWORD}}

**WebAuthn Setup** (Required):
1. Log in with your temporary password
2. Navigate to Settings → Security
3. Click "Register Security Key"
4. Follow browser prompts to register biometric or hardware key
5. Test step-up authentication by attempting an export

**What's New in October 2025**:
- WebAuthn step-up authentication for sensitive operations
- OPA-based policy enforcement
- Enhanced security scanning and SBOM generation
- SLO dashboards with trace exemplars
- Real-time synthetics monitoring

**Support**:
- Documentation: https://docs.intelgraph.example.com
- Slack: #intelgraph-pilot
- Email: pilot-support@example.com

Thank you for participating!

The IntelGraph Team
EOF

# Send emails (manual or via script)
# TODO: Integrate with email service (SendGrid, Mailgun, etc.)
```

---

## Pilot Monitoring and Support

### Monitoring Dashboard

**Access Grafana**:

```bash
# Get Grafana URL
kubectl get ingress -n intelgraph-pilot grafana-ingress -o jsonpath='{.spec.rules[0].host}'

# Example: https://grafana-pilot.intelgraph.example.com
```

**Key Dashboards**:

- **SLO Core Dashboards**: Monitor API latency, OPA latency, queue lag, ingest failures, golden flow pass rate
- **SLO Dashboards with Trace Exemplars**: Click data points to view traces
- **Security Control Effectiveness**: Monitor release gate blocks, step-up auth success rate, vulnerability detection

**Key Metrics to Watch**:

- API p95 latency: <1.5s (SLO)
- OPA p95 latency: <500ms (SLO)
- Golden flow success rate: >99% (SLO)
- Step-up authentication success rate: >95%
- Release gate block rate: <5%

---

### Support Channels

**Slack Channels**:

- `#intelgraph-pilot`: General pilot discussion
- `#intelgraph-pilot-support`: Support requests
- `#intelgraph-alerts`: SLO violation alerts (internal)

**Escalation Path**:

- L1: Customer Success (Slack: #intelgraph-pilot-support, Email: pilot-support@example.com)
- L2: SRE (Slack: #sre, PagerDuty: `pd schedule show sre-oncall`)
- L3: Engineering Lead (Slack: @engineering-lead)

**Response SLAs**:

- Critical (service down): 15 minutes
- High (major feature broken): 2 hours
- Medium (minor issue): 8 hours
- Low (question/enhancement): 24 hours

---

### Pilot Feedback Collection

**Weekly Check-ins**:

- Schedule: Every Friday at 2 PM ET
- Format: 30-minute video call
- Agenda: Usage stats, issues encountered, feature requests, UX feedback

**Feedback Form**:

```markdown
# IntelGraph Pilot Feedback - Week {{WEEK_NUMBER}}

**Customer**: {{CUSTOMER_NAME}}
**Date**: {{DATE}}

## Usage Stats

- Active Users: {{ACTIVE_USERS}}
- Entities Ingested: {{ENTITY_COUNT}}
- Queries Executed: {{QUERY_COUNT}}
- Exports Performed: {{EXPORT_COUNT}}
- Step-Up Authentications: {{STEPUP_COUNT}}

## Feature Feedback

1. **WebAuthn Step-Up**:
   - Ease of Use (1-5): {{RATING}}
   - Comments: {{COMMENTS}}

2. **OPA Policy Enforcement**:
   - Transparency (1-5): {{RATING}}
   - Comments: {{COMMENTS}}

3. **SLO Dashboards**:
   - Usefulness (1-5): {{RATING}}
   - Comments: {{COMMENTS}}

## Issues Encountered

- {{ISSUE_1}}
- {{ISSUE_2}}

## Feature Requests

- {{REQUEST_1}}
- {{REQUEST_2}}

## Overall Satisfaction (1-5): {{OVERALL_RATING}}
```

**Submit feedback**:

- Form: https://forms.intelgraph.example.com/pilot-feedback
- Email: pilot-feedback@example.com
- Slack: #intelgraph-pilot

---

## Rollback Procedures

**If critical issues arise during pilot**:

### Step 1: Assess Impact

```bash
# Check error rate
curl https://pilot.intelgraph.example.com/metrics | grep http_requests_total

# Check recent logs for errors
kubectl logs -n intelgraph-pilot -l app=intelgraph-pilot --tail=100 | grep ERROR

# Check SLO violations
curl http://prometheus:9090/api/v1/query?query=ALERTS | jq '.data.result[] | select(.metric.alertname | contains("SLO"))'
```

### Step 2: Rollback to Previous Version

```bash
# List recent releases
helm history intelgraph-pilot -n intelgraph-pilot

# Rollback to previous release
helm rollback intelgraph-pilot -n intelgraph-pilot

# Or rollback to specific revision
helm rollback intelgraph-pilot <revision> -n intelgraph-pilot

# Monitor rollback
kubectl rollout status deployment/intelgraph-pilot -n intelgraph-pilot
```

### Step 3: Verify Rollback Success

```bash
# Check pods are running previous version
kubectl get pods -n intelgraph-pilot -o jsonpath='{.items[0].spec.containers[0].image}'

# Run health checks
curl https://pilot.intelgraph.example.com/health

# Run E2E test
./scripts/e2e/golden-path.sh
```

### Step 4: Notify Stakeholders

```markdown
Subject: IntelGraph Pilot - Rollback to Previous Version

Dear Pilot Participants,

We have rolled back the IntelGraph pilot environment to the previous version due to [ISSUE_DESCRIPTION].

**Details**:

- Rollback Time: {{TIMESTAMP}}
- Previous Version: {{PREVIOUS_VERSION}}
- Current Version: {{CURRENT_VERSION}}
- Impact: {{IMPACT_DESCRIPTION}}

**Next Steps**:

- Engineering team is investigating the issue
- Fix ETA: {{FIX_ETA}}
- We will notify you when the fix is deployed

We apologize for any inconvenience. Please contact pilot-support@example.com with any questions.

Thank you,
The IntelGraph Team
```

---

## Success Criteria

**Pilot is considered successful if**:

- [ ] **Uptime**: >99.5% availability over 30 days
- [ ] **Performance**: All SLOs met (API p95 <1.5s, OPA p95 <500ms, golden flow >99%)
- [ ] **Security**: Zero critical security incidents
- [ ] **User Satisfaction**: Average rating ≥4/5 across all pilot customers
- [ ] **Feature Adoption**:
  - [ ] WebAuthn step-up: >90% of users registered
  - [ ] Export with provenance: >80% of exports include provenance
  - [ ] Policy enforcement: <2% false positive rate
- [ ] **Support**: <5% of requests escalated to L3

**Pilot results will inform**:

- General availability (GA) readiness decision
- Feature refinements for GA release
- Documentation improvements
- Training materials

---

## Post-Pilot Steps

**After successful pilot completion**:

1. **Gather Final Feedback**:
   - Send pilot completion survey
   - Schedule retrospective calls with each customer
   - Document lessons learned

2. **Prepare for GA**:
   - Update documentation based on pilot feedback
   - Fix any non-critical issues identified
   - Prepare GA deployment guide
   - Create GA release notes

3. **Pilot-to-GA Migration**:
   - Offer pilot customers early GA access
   - Provide migration guide from pilot to GA
   - Offer white-glove migration support

4. **Celebrate Success**:
   - Share pilot success metrics with team
   - Recognize contributors
   - Publish case studies (with customer permission)

---

## Contacts

- **Customer Success**: customer-success@example.com, Slack: #customer-success
- **SRE**: sre@example.com, Slack: #sre
- **Security**: security@example.com, Slack: #security
- **Product**: product@example.com, Slack: #product
- **Engineering**: engineering@example.com, Slack: #engineering

---

## Related Documentation

- [CI Release Gate Runbook](runbooks/CI_RELEASE_GATE_RUNBOOK.md)
- [Synthetics & Dashboards Runbook](runbooks/SYNTHETICS_DASHBOARDS_RUNBOOK.md)
- [Threat Model Delta](THREAT_MODEL_DELTA_OCT2025.md)
- [WebAuthn Step-Up README](WEBAUTHN_STEPUP_README.md)
- [E2E Golden Path README](E2E_GOLDEN_PATH_README.md)
- [Release Notes](RELEASE_NOTES_2025.10.HALLOWEEN.md)

---

**Last Updated**: October 4, 2025
**Version**: 1.0
**Issue**: #10074
