# Service Mesh Operations Runbook

> **Document Status**: Production Ready
> **Last Updated**: 2025-11-20
> **Owner**: Platform Engineering / SRE Team
> **On-Call Priority**: P1 (Critical Infrastructure)

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Installation](#installation)
3. [Day 2 Operations](#day-2-operations)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Disaster Recovery](#disaster-recovery)
7. [Upgrades](#upgrades)

---

## Quick Reference

### Essential Commands

```bash
# Check Istio version
istioctl version

# Verify installation
istioctl verify-install

# Analyze mesh configuration
istioctl analyze -n summit

# Get Envoy config for a pod
istioctl proxy-config cluster <pod-name> -n summit

# View access logs
kubectl logs <pod-name> -n summit -c istio-proxy

# Enable debug logging on sidecar
istioctl proxy-config log <pod-name> -n summit --level debug

# Check mesh connectivity
istioctl dashboard controlz <istiod-pod>

# View Envoy stats
kubectl exec -it <pod-name> -n summit -c istio-proxy -- curl localhost:15000/stats/prometheus
```

### Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Jaeger UI | http://jaeger.summit.example.com | Distributed tracing |
| Grafana | http://grafana.summit.example.com | Service mesh dashboards |
| Prometheus | http://prometheus.summit.example.com | Metrics |
| Kiali | http://kiali.summit.example.com | Service mesh visualization |

### Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| `istio_requests_total{response_code="5xx"}` | >1% | Investigate failing services |
| `istio_request_duration_milliseconds{quantile="0.95"}` | >2000ms | Check for slow services |
| `pilot_xds_pushes{type="eds"}` | Increasing rapidly | Control plane issue |
| `envoy_cluster_upstream_cx_connect_fail` | >5% | Network or service issue |

---

## Installation

### Prerequisites

```bash
# 1. Kubernetes cluster (v1.24+)
kubectl version

# 2. Install istioctl
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH

# 3. Verify cluster requirements
istioctl x precheck
```

### Deploy Istio Control Plane

#### Step 1: Create Namespace

```bash
kubectl create namespace istio-system
kubectl label namespace istio-system istio-injection=disabled
```

#### Step 2: Install Istio

```bash
# Option 1: Using IstioOperator (recommended)
kubectl apply -f infrastructure/kubernetes/multi-cluster/istio/primary-cluster.yaml

# Wait for installation
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=600s

# Verify installation
istioctl verify-install
```

#### Step 3: Deploy Gateways

```bash
# Ingress Gateway
kubectl apply -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: ingress-gateway
  namespace: istio-system
spec:
  profile: empty
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: LoadBalancer
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
EOF

# Wait for LoadBalancer IP
kubectl get svc istio-ingressgateway -n istio-system -w
```

#### Step 4: Enable Sidecar Injection

```bash
# Label namespaces for automatic injection
kubectl label namespace summit istio-injection=enabled

# Verify label
kubectl get namespace summit --show-labels
```

#### Step 5: Deploy Observability Stack

```bash
# OpenTelemetry Collector
kubectl apply -f infra/service-mesh/distributed-tracing.yaml

# Verify deployment
kubectl wait --for=condition=ready pod -l app=otel-collector -n observability --timeout=300s
kubectl wait --for=condition=ready pod -l app=jaeger -n observability --timeout=300s
```

#### Step 6: Apply Traffic Policies

```bash
# Circuit breakers
kubectl apply -f infra/service-mesh/circuit-breakers.yaml

# Retry policies
kubectl apply -f infra/service-mesh/retry-policies.yaml

# Load balancing
kubectl apply -f infra/service-mesh/load-balancing.yaml

# Verify configurations
istioctl analyze -n summit
```

### Validation

```bash
# 1. Check control plane health
kubectl get pods -n istio-system
# All pods should be Running

# 2. Verify sidecar injection
kubectl get pods -n summit -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}'
# Should show "istio-proxy" container

# 3. Test mTLS
istioctl authn tls-check <pod-name>.summit -n summit

# 4. Check metrics endpoint
kubectl exec -it <pod-name> -n summit -c istio-proxy -- curl localhost:15020/stats/prometheus

# 5. Run smoke tests
./scripts/smoke-test.sh
```

---

## Day 2 Operations

### 1. Onboarding a New Service

#### Checklist

```bash
# 1. Ensure namespace has injection enabled
kubectl label namespace summit istio-injection=enabled --overwrite

# 2. Deploy service with health checks
kubectl apply -f services/my-new-service/k8s/

# 3. Verify sidecar injection
kubectl get pod -n summit -l app=my-new-service -o jsonpath='{.items[0].spec.containers[*].name}'
# Should output: my-new-service istio-proxy

# 4. Apply DestinationRule
cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-new-service
  namespace: summit
spec:
  host: my-new-service.summit.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      simple: LEAST_REQUEST
EOF

# 5. Apply VirtualService (if custom routing needed)
cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-new-service
  namespace: summit
spec:
  hosts:
  - my-new-service.summit.svc.cluster.local
  http:
  - retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
    timeout: 10s
    route:
    - destination:
        host: my-new-service.summit.svc.cluster.local
EOF

# 6. Test connectivity
kubectl run test-pod --rm -it --image=curlimages/curl --restart=Never -- \
  curl -v http://my-new-service.summit.svc.cluster.local/health

# 7. Check traces in Jaeger
# Visit: http://jaeger.summit.example.com
# Search for service: my-new-service

# 8. Monitor metrics
# Visit: http://grafana.summit.example.com
# Dashboard: "Istio Service Dashboard"
# Filter by: my-new-service
```

### 2. Certificate Rotation

Istio automatically rotates certificates every 24 hours. Manual rotation:

```bash
# Check certificate expiration
istioctl proxy-config secret <pod-name> -n summit

# Force certificate rotation (restart pod)
kubectl rollout restart deployment/<deployment-name> -n summit

# Verify new certificates
istioctl proxy-config secret <pod-name> -n summit
```

### 3. Configuration Updates

#### Update DestinationRule

```bash
# Edit configuration
kubectl edit destinationrule graph-core -n summit

# Or apply updated file
kubectl apply -f infra/service-mesh/circuit-breakers.yaml

# Verify changes propagated
istioctl proxy-config cluster <pod-name> -n summit | grep graph-core

# Monitor for issues
kubectl logs -n summit <pod-name> -c istio-proxy --tail=100 -f
```

#### Update VirtualService

```bash
# Apply changes
kubectl apply -f infra/service-mesh/retry-policies.yaml

# Verify routing
istioctl proxy-config route <pod-name> -n summit | grep graph-core

# Test with curl
kubectl run test-pod --rm -it --image=curlimages/curl --restart=Never -- \
  curl -v -H "x-test: canary" http://graph-core.summit.svc.cluster.local/health
```

### 4. Scaling

#### Control Plane Scaling

```bash
# Scale istiod
kubectl scale deployment istiod -n istio-system --replicas=5

# Verify
kubectl get pods -n istio-system -l app=istiod

# Check resource usage
kubectl top pods -n istio-system -l app=istiod
```

#### Gateway Scaling

```bash
# Scale ingress gateway
kubectl scale deployment istio-ingressgateway -n istio-system --replicas=5

# Or use HPA (recommended)
kubectl autoscale deployment istio-ingressgateway -n istio-system \
  --cpu-percent=70 --min=3 --max=10
```

---

## Troubleshooting

### Scenario 1: Service Returns 503 (Circuit Breaker Tripped)

**Symptoms:**
- Service returns 503 errors
- Envoy logs show: `upstream_reset_before_response_started{overflow}`

**Diagnosis:**

```bash
# 1. Check Envoy stats for circuit breaker trips
kubectl exec -it <pod-name> -n summit -c istio-proxy -- \
  curl localhost:15000/stats | grep upstream_cx_overflow

# 2. Check DestinationRule settings
kubectl get destinationrule -n summit -o yaml | grep -A 20 "host: <service-name>"

# 3. View current connection pool usage
kubectl exec -it <pod-name> -n summit -c istio-proxy -- \
  curl localhost:15000/stats | grep upstream_cx_active
```

**Resolution:**

```bash
# Increase connection limits
kubectl patch destinationrule <service-name> -n summit --type merge -p '
spec:
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http2MaxRequests: 500
'

# Verify changes
kubectl rollout restart deployment <deployment-name> -n summit
```

### Scenario 2: High Latency

**Symptoms:**
- P95 latency >2s
- Prometheus alerts firing

**Diagnosis:**

```bash
# 1. Check Jaeger for slow traces
# Visit: http://jaeger.summit.example.com
# Sort by: Duration (descending)

# 2. Check for retries
kubectl logs -n summit <pod-name> -c istio-proxy | grep -i retry

# 3. Check outlier detection
istioctl proxy-config cluster <pod-name> -n summit | grep -A 10 <service-name>

# 4. Check if circuit breaker is causing retry storms
kubectl exec -it <pod-name> -n summit -c istio-proxy -- \
  curl localhost:15000/stats | grep upstream_rq_retry
```

**Resolution:**

```bash
# Option 1: Reduce retry attempts
kubectl patch virtualservice <service-name> -n summit --type merge -p '
spec:
  http:
  - retries:
      attempts: 2
      perTryTimeout: 1s
'

# Option 2: Increase timeout
kubectl patch virtualservice <service-name> -n summit --type merge -p '
spec:
  http:
  - timeout: 30s
'

# Option 3: Scale service
kubectl scale deployment <service-name> -n summit --replicas=10
```

### Scenario 3: mTLS Handshake Failures

**Symptoms:**
- Connection refused errors
- Envoy logs: `SSL error: sslv3 alert certificate unknown`

**Diagnosis:**

```bash
# 1. Check mTLS status
istioctl authn tls-check <pod-name>.summit -n summit

# 2. Check peer authentication
kubectl get peerauthentication -n summit

# 3. Check destination rule TLS settings
kubectl get destinationrule -n summit -o yaml | grep -A 5 tls

# 4. Verify certificates
istioctl proxy-config secret <pod-name> -n summit
```

**Resolution:**

```bash
# Option 1: Verify PeerAuthentication is STRICT
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: summit
spec:
  mtls:
    mode: STRICT
EOF

# Option 2: Check DestinationRule TLS mode
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: <service-name>
  namespace: summit
spec:
  host: <service-name>.summit.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
EOF

# Option 3: Restart pods to refresh certificates
kubectl rollout restart deployment <deployment-name> -n summit
```

### Scenario 4: Control Plane Unavailable

**Symptoms:**
- Sidecars cannot reach istiod
- Logs: `connection refused 15012`

**Diagnosis:**

```bash
# 1. Check istiod pods
kubectl get pods -n istio-system -l app=istiod

# 2. Check istiod logs
kubectl logs -n istio-system -l app=istiod --tail=100

# 3. Check istiod service
kubectl get svc istiod -n istio-system

# 4. Test connectivity from sidecar
kubectl exec -it <pod-name> -n summit -c istio-proxy -- \
  curl -v istiod.istio-system.svc.cluster.local:15012/debug/configz
```

**Resolution:**

```bash
# Option 1: Restart istiod
kubectl rollout restart deployment istiod -n istio-system

# Option 2: Check network policies
kubectl get networkpolicy -n istio-system

# Option 3: Verify DNS resolution
kubectl run test-dns --rm -it --image=busybox --restart=Never -- \
  nslookup istiod.istio-system.svc.cluster.local

# Option 4: Emergency - Disable injection temporarily
kubectl label namespace summit istio-injection-
kubectl rollout restart deployment <deployment-name> -n summit
```

### Scenario 5: Memory Leak in Sidecar

**Symptoms:**
- Sidecar memory increasing over time
- OOMKilled events

**Diagnosis:**

```bash
# 1. Check memory usage
kubectl top pods -n summit --containers | grep istio-proxy

# 2. Check Envoy heap
kubectl exec -it <pod-name> -n summit -c istio-proxy -- \
  curl localhost:15000/memory

# 3. Check for memory leaks
kubectl exec -it <pod-name> -n summit -c istio-proxy -- \
  curl localhost:15000/stats | grep -i memory
```

**Resolution:**

```bash
# Increase memory limits
kubectl patch deployment <deployment-name> -n summit --type json -p='[
  {
    "op": "replace",
    "path": "/spec/template/metadata/annotations/sidecar.istio.io~1proxyCPU",
    "value": "200m"
  },
  {
    "op": "replace",
    "path": "/spec/template/metadata/annotations/sidecar.istio.io~1proxyMemory",
    "value": "512Mi"
  }
]'

# Restart deployment
kubectl rollout restart deployment <deployment-name> -n summit
```

---

## Monitoring & Alerting

### Key Dashboards

**Grafana Dashboards:**

1. **Istio Mesh Dashboard**
   - Overall mesh health
   - Request rate, success rate, latency
   - Control plane health

2. **Istio Service Dashboard**
   - Per-service metrics
   - Inbound/outbound traffic
   - Circuit breaker status

3. **Istio Workload Dashboard**
   - Per-pod metrics
   - CPU/memory usage
   - Connection pool utilization

### Alert Rules

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-alerts
  namespace: observability
spec:
  groups:
  - name: istio
    interval: 30s
    rules:
    # High error rate
    - alert: IstioHighErrorRate
      expr: |
        sum(rate(istio_requests_total{response_code=~"5.."}[5m]))
        /
        sum(rate(istio_requests_total[5m]))
        > 0.01
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate in service mesh"
        description: "Error rate is {{ $value | humanizePercentage }}"

    # High latency
    - alert: IstioHighLatency
      expr: |
        histogram_quantile(0.95,
          sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service)
        ) > 2000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P95 latency for {{ $labels.destination_service }}"
        description: "P95 latency is {{ $value }}ms"

    # Control plane down
    - alert: IstioControlPlaneDown
      expr: up{job="istiod"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Istio control plane is down"
        description: "Istiod instance {{ $labels.instance }} is down"

    # Certificate expiring soon
    - alert: IstioCertificateExpiringSoon
      expr: |
        (pilot_cert_expiry_seconds - time()) / 86400 < 7
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Istio certificate expiring soon"
        description: "Certificate expires in {{ $value }} days"
```

---

## Disaster Recovery

### Backup

```bash
# Backup Istio configuration
kubectl get --export -o yaml \
  virtualservice,destinationrule,gateway,serviceentry,peerauthentication,authorizationpolicy \
  --all-namespaces > istio-config-backup-$(date +%Y%m%d).yaml

# Backup control plane config
kubectl get istiooperator -n istio-system -o yaml > istio-operator-backup-$(date +%Y%m%d).yaml
```

### Restore

```bash
# Restore control plane
kubectl apply -f istio-operator-backup-YYYYMMDD.yaml

# Wait for control plane
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=600s

# Restore mesh configuration
kubectl apply -f istio-config-backup-YYYYMMDD.yaml

# Verify
istioctl verify-install
```

### Failover to Secondary Cluster

```bash
# 1. Update DNS to point to secondary cluster ingress
# 2. Verify multi-cluster connectivity
istioctl verify-install --context=secondary-cluster

# 3. Check service health in secondary cluster
kubectl get pods -n summit --context=secondary-cluster
```

---

## Upgrades

### Upgrade Istio (Canary Method)

```bash
# 1. Download new version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.21.0 sh -
cd istio-1.21.0
export PATH=$PWD/bin:$PATH

# 2. Install canary control plane
istioctl install --set revision=1-21-0 --set profile=default -y

# 3. Verify canary installation
kubectl get pods -n istio-system -l app=istiod

# 4. Test with canary namespace
kubectl label namespace summit-canary istio.io/rev=1-21-0 istio-injection-

# 5. Deploy test workload
kubectl apply -f test-workload.yaml -n summit-canary

# 6. Validate canary (monitor for 24-48 hours)
# Check metrics, traces, logs

# 7. Migrate production namespace
kubectl label namespace summit istio.io/rev=1-21-0 istio-injection- --overwrite

# 8. Restart workloads
kubectl rollout restart deployment -n summit

# 9. Verify all workloads using new version
kubectl get pods -n summit -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.sidecar\.istio\.io/status}{"\n"}{end}'

# 10. Remove old control plane (after validation period)
istioctl uninstall --revision=1-20-0 -y

# 11. Cleanup
kubectl delete service istiod-1-20-0 -n istio-system
```

---

## Related Documentation

- [Service Mesh Architecture](../docs/architecture/service-mesh-architecture.md)
- [Service Mesh Best Practices](../docs/architecture/service-mesh-best-practices.md)
- [Istio Documentation](https://istio.io/latest/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| SRE On-Call | Pagerduty | +1-XXX-XXX-XXXX |
| Platform Lead | TBD | email@example.com |
| Security Team | TBD | security@example.com |

---

**Last Reviewed**: 2025-11-20
**Next Review**: 2026-02-20
