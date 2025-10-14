# MC Platform v0.3.9 Deployment Guide

## Overview

MC Platform v0.3.9 "Sovereign Console" represents the culmination of quantum-ready infrastructure with complete administrative sovereignty. This deployment guide covers the full production deployment process from validation through post-deployment monitoring.

## Architecture

### Platform Components

1. **Quantum-Ready Services**
   - **PQA (Post-Quantum Attestation)**: Dual signature scheme with Ed25519 + Dilithium2
   - **ZKFSA (Zero-Knowledge Fairness & Safety Audits)**: Privacy-preserving compliance monitoring
   - **PoDR (Proof-of-DR)**: Cryptographic disaster recovery validation
   - **RGE (Regulator-Grade Export)**: Machine-verifiable compliance packages
   - **BFT-Eco (Byzantine Fault Tolerant Eco)**: Carbon-aware consensus

2. **Sovereign Console**
   - **GraphQL API**: Complete administrative interface with persisted queries
   - **OPA Policy Engine**: Attribute-based access control (ABAC)
   - **Evidence System**: Cryptographic audit trail generation
   - **TypeScript Client SDK**: Type-safe administrative operations

3. **Infrastructure**
   - **Kubernetes Deployment**: Production-grade container orchestration
   - **Observability Stack**: Prometheus metrics + Grafana dashboards
   - **Network Security**: Network policies + ingress with TLS
   - **Compliance Framework**: SOC2-ready evidence collection

## Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.24+ with RBAC enabled
- **Container Runtime**: containerd or Docker
- **Storage**: Persistent volumes for evidence storage
- **Networking**: Ingress controller (nginx recommended)
- **Monitoring**: Prometheus operator installed

### Access Requirements

- `kubectl` access to target cluster
- Cluster admin permissions for namespace creation
- TLS certificate management (cert-manager recommended)
- DNS configuration for external access

### Tool Requirements

```bash
kubectl version --client
helm version
python3 --version  # 3.11+
node --version      # 18+
```

## Deployment Process

### Phase 1: Pre-Deployment Validation

Run the comprehensive validation suite:

```bash
./scripts/validate-complete-evolution.sh --production-check
```

This validates:
- All quantum-ready modules compile successfully
- Dependencies are available
- Performance targets are achievable
- Security configurations are valid

### Phase 2: Production Deployment

Execute the automated deployment:

```bash
./scripts/deploy-production.sh v0.3.9 mc-platform production
```

#### Deployment Steps

1. **Infrastructure Validation**
   - Cluster connectivity verification
   - Namespace creation and configuration
   - Resource quota validation

2. **Policy Engine Deployment**
   - OPA server with ABAC policies
   - Policy ConfigMaps and rules
   - Authorization service configuration

3. **Quantum-Ready Services**
   - PQA service (2 replicas)
   - ZKFSA service (2 replicas)
   - PoDR service (1 replica)
   - Service mesh configuration

4. **Sovereign Console API**
   - GraphQL API (3 replicas)
   - Persisted queries configuration
   - Evidence generation endpoints

5. **Observability Stack**
   - Prometheus ServiceMonitor
   - PrometheusRule for SLO monitoring
   - Grafana dashboard integration

6. **Network Security**
   - Network policies for micro-segmentation
   - Ingress with TLS termination
   - Rate limiting configuration

### Phase 3: Post-Deployment Validation

Run comprehensive validation tests:

```bash
./scripts/post-deployment-validation.sh mc-platform https://api.mc-platform.com/graphql
```

#### Validation Coverage

- **Infrastructure**: All deployments ready and healthy
- **Connectivity**: Inter-service communication validated
- **API**: GraphQL introspection and persisted queries
- **Security**: Policy enforcement and network isolation
- **Observability**: Metrics collection and alerting
- **Performance**: SLA compliance verification
- **Compliance**: Audit readiness and evidence generation

## Configuration

### Environment Variables

```bash
# Core Configuration
export MC_VERSION="v0.3.9"
export MC_NAMESPACE="mc-platform"
export MC_API_ENDPOINT="https://api.mc-platform.com/graphql"

# OPA Configuration
export OPA_URL="http://opa-server:8181"
export OPA_DECISION_PATH="/v1/data/mc/admin/decision"

# Observability
export PROMETHEUS_NAMESPACE="monitoring"
export GRAFANA_NAMESPACE="monitoring"
```

### Kubernetes Resources

#### Namespace Configuration

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mc-platform
  labels:
    security.compliance/level: "high"
    observability.prometheus.io/scrape: "true"
```

#### Resource Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| GraphQL API | 200m | 1000m | 512Mi | 1Gi |
| OPA Server | 100m | 500m | 256Mi | 512Mi |
| PQA Service | 100m | 500m | 256Mi | 512Mi |
| ZKFSA Service | 200m | 1000m | 512Mi | 1Gi |
| PoDR Service | 100m | 500m | 256Mi | 512Mi |

## Client SDK Usage

### Installation

```bash
npm install mc-admin-client
```

### Configuration

```typescript
import { McAdminClient } from 'mc-admin-client';

const mc = new McAdminClient('https://api.mc-platform.com/graphql', {
  'x-actor-id': 'ops-admin-001',
  'x-actor-role': 'platform-admin',
  'x-actor-tenant': 'ALL'
});
```

### Operations

#### Feature Flag Management

```typescript
await mc.setFeatureFlags({
  tenant: 'TENANT_001',
  flags: {
    quantumReadyMode: true,
    enhancedAuditing: true,
    zkPrivacyMode: false
  }
});
```

#### SLO Threshold Configuration

```typescript
await mc.setSloThresholds({
  tenant: 'ALL',
  thresholds: {
    composite: 0.87,
    jwsFail: 0.001,
    budgetNoise: 0.05,
    graphqlP95: 350,
    aaLag: 120
  }
});
```

#### Evidence Pack Generation

```typescript
const evidence = await mc.evidencePack({
  version: 'v0.3.9'
});

console.log('Evidence artifacts:', evidence.artifacts.length);
console.log('Cryptographic signature:', evidence.signature);
```

#### Disaster Recovery Validation

```typescript
const drResult = await mc.podrRun({
  tenant: 'TENANT_001'
});

console.log('DR drill result:', drResult.success);
console.log('RTO achieved:', drResult.rto_seconds, 'seconds');
console.log('RPO achieved:', drResult.rpo_seconds, 'seconds');
```

## Monitoring and Observability

### Key Metrics

#### Performance SLAs

- **GraphQL P95 Latency**: < 350ms
- **Error Rate**: < 0.1%
- **Availability**: > 99.9%
- **PQA Verification Time**: < 5ms
- **ZKFSA Audit Time**: < 30s

#### Quantum-Ready Metrics

```promql
# PQA signature verification rate
rate(pqa_signature_verifications_total[5m])

# ZKFSA audit success rate
rate(zkfsa_audit_success_total[5m]) / rate(zkfsa_audit_total[5m])

# PoDR drill completion time
histogram_quantile(0.95, rate(podr_drill_duration_seconds_bucket[5m]))
```

### Alerting Rules

#### Critical Alerts

```yaml
- alert: MCPlatformHighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "MC Platform experiencing high error rate"
    runbook_url: "https://docs.mc-platform.com/runbooks/high-error-rate"

- alert: QuantumReadinessCompromised
  expr: rate(pqa_verification_failures_total[5m]) > 0.05
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Post-quantum attestation verification failures detected"
```

### Grafana Dashboards

Import the provided dashboard:

```bash
kubectl apply -f observability/grafana/dashboards/v0.3.9/mc-v039-sovereign-console.json
```

Dashboard includes:
- **Platform Overview**: Health, SLA compliance, resource utilization
- **Quantum-Ready Metrics**: PQA, ZKFSA, PoDR performance
- **API Performance**: GraphQL latency, throughput, error rates
- **Security Monitoring**: Policy violations, audit events
- **Compliance Tracking**: Evidence generation, regulatory exports

## Security Considerations

### Access Control

#### RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: mc-platform
  name: mc-platform-operator
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "patch"]
```

#### OPA Policy Examples

```rego
package mc.admin

# Require platform-admin role for global operations
allow {
  input.operation.isMutation
  input.actor.role == "platform-admin"
  input.tenant == "ALL"
}

# Allow tenant-admin for tenant-scoped operations
allow {
  input.operation.isMutation
  input.actor.role == "tenant-admin"
  input.tenant == input.actor.tenant
  input.tenant != "ALL"
}

# Enforce data residency
residency_check {
  input.tenant_region == input.actor.region
  input.operation.data_type in ["personal", "sensitive"]
}
```

### Network Security

#### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mc-platform-strict
  namespace: mc-platform
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-system
  egress:
  - to:
    - podSelector: {}
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### Compliance

#### Evidence Collection

Evidence is automatically collected for:
- **Administrative Operations**: All GraphQL mutations
- **Policy Decisions**: OPA authorization results
- **Quantum Operations**: PQA signatures, ZKFSA audits
- **Disaster Recovery**: PoDR drill results
- **Performance Metrics**: SLA compliance data

#### Audit Trail Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event_id": "evt_7f8a9b2c3d4e5f6g",
  "actor": {
    "id": "ops-admin-001",
    "role": "platform-admin",
    "tenant": "ALL"
  },
  "operation": {
    "type": "setSloThresholds",
    "tenant": "TENANT_001",
    "parameters": { "composite": 0.87 }
  },
  "policy_decision": {
    "allowed": true,
    "rules_applied": ["mc.admin.platform_admin_global"]
  },
  "cryptographic_proof": {
    "signature": "sha256:a1b2c3d4...",
    "algorithm": "Ed25519+Dilithium2"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. OPA Policy Denials

**Symptom**: GraphQL mutations return "policy_denied" errors

**Resolution**:
```bash
# Check OPA logs
kubectl logs -n mc-platform deployment/opa-server

# Validate policy syntax
kubectl exec -n mc-platform deployment/opa-server -- opa fmt /policies/mc-admin.rego

# Test policy with sample input
kubectl exec -n mc-platform deployment/opa-server -- opa eval -d /policies "data.mc.admin.allow" --input input.json
```

#### 2. Quantum Service Failures

**Symptom**: PQA/ZKFSA/PoDR endpoints returning errors

**Resolution**:
```bash
# Check service logs
kubectl logs -n mc-platform deployment/pqa-service
kubectl logs -n mc-platform deployment/zkfsa-service
kubectl logs -n mc-platform deployment/podr-service

# Validate Python modules
python3 -m py_compile ./ops/pqa/signer.py
python3 -m py_compile ./ops/zkfsa/circuits.py
python3 -m py_compile ./ops/podr/tracer.py
```

#### 3. Network Connectivity Issues

**Symptom**: Services cannot communicate with each other

**Resolution**:
```bash
# Check network policies
kubectl get networkpolicy -n mc-platform

# Test service connectivity
kubectl exec -n mc-platform deployment/mc-graphql-api -- wget -qO- http://opa-server:8181/health

# Validate DNS resolution
kubectl exec -n mc-platform deployment/mc-graphql-api -- nslookup opa-server
```

### Performance Issues

#### High Latency

1. **Check resource utilization**:
   ```bash
   kubectl top pods -n mc-platform
   ```

2. **Analyze GraphQL query complexity**:
   ```bash
   kubectl logs -n mc-platform deployment/mc-graphql-api | grep "query_complexity"
   ```

3. **Review Prometheus metrics**:
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
   ```

#### Memory Issues

1. **Increase resource limits**:
   ```bash
   kubectl patch deployment mc-graphql-api -n mc-platform -p '{"spec":{"template":{"spec":{"containers":[{"name":"graphql","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
   ```

2. **Check for memory leaks**:
   ```bash
   kubectl exec -n mc-platform deployment/mc-graphql-api -- node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"
   ```

## Disaster Recovery

### Backup Procedures

#### Evidence Archive Backup

```bash
# Create evidence archive
kubectl exec -n mc-platform deployment/mc-graphql-api -- tar czf /tmp/evidence-backup.tar.gz /data/evidence

# Copy to external storage
kubectl cp mc-platform/mc-graphql-api-pod:/tmp/evidence-backup.tar.gz ./evidence-backup-$(date +%Y%m%d).tar.gz
```

#### Configuration Backup

```bash
# Export all Kubernetes resources
kubectl get all,configmaps,secrets,networkpolicies,ingress -n mc-platform -o yaml > mc-platform-backup.yaml

# Backup OPA policies
kubectl get configmap opa-policies -n mc-platform -o yaml > opa-policies-backup.yaml
```

### Recovery Procedures

#### Complete Platform Recovery

1. **Restore Kubernetes resources**:
   ```bash
   kubectl apply -f mc-platform-backup.yaml
   ```

2. **Restore evidence archive**:
   ```bash
   kubectl cp ./evidence-backup.tar.gz mc-platform/mc-graphql-api-pod:/tmp/
   kubectl exec -n mc-platform deployment/mc-graphql-api -- tar xzf /tmp/evidence-backup.tar.gz -C /
   ```

3. **Validate recovery**:
   ```bash
   ./scripts/post-deployment-validation.sh mc-platform
   ```

## Maintenance

### Regular Maintenance Tasks

#### Weekly

- Review SLO burn rates and adjust thresholds if needed
- Validate evidence archive integrity
- Check for security policy violations
- Update quantum-ready algorithms if new standards available

#### Monthly

- Rotate cryptographic keys for PQA signatures
- Conduct PoDR disaster recovery drill
- Review and update OPA policies
- Performance optimization review

#### Quarterly

- Comprehensive security audit
- Compliance evidence package generation
- Capacity planning review
- Update quantum-resistant algorithms per NIST standards

### Version Upgrades

#### Minor Version Upgrades (v0.3.x)

1. **Deploy to staging environment**
2. **Run regression tests**
3. **Update production with rolling deployment**
4. **Validate with post-deployment tests**

#### Major Version Upgrades (v0.x.0)

1. **Review breaking changes**
2. **Plan migration strategy**
3. **Backup current state**
4. **Deploy with blue-green strategy**
5. **Comprehensive validation**
6. **Evidence migration if required**

## Support

### Documentation

- **API Reference**: `/docs/api/graphql-schema.md`
- **Runbooks**: `/docs/runbooks/`
- **Architecture**: `/docs/architecture/`
- **Security**: `/docs/security/`

### Monitoring URLs

- **Grafana Dashboards**: `https://grafana.mc-platform.com`
- **Prometheus Metrics**: `https://prometheus.mc-platform.com`
- **Health Check**: `https://api.mc-platform.com/health`
- **GraphQL Playground**: `https://api.mc-platform.com/graphql`

### Emergency Contacts

For production issues:
1. **Platform Team**: platform-team@company.com
2. **Security Team**: security-team@company.com
3. **On-Call**: PagerDuty service `mc-platform-prod`

---

**MC Platform v0.3.9** represents the pinnacle of quantum-ready sovereign console technology, providing enterprise-grade administrative capabilities with uncompromising security and compliance standards.