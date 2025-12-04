# Zero-Trust Policy Denials Runbook

## Alert: ZeroTrustPolicyDenialRateHigh

### Overview
This alert fires when the rate of 403 (Forbidden) responses from a service exceeds 10% over a 5-minute window. This may indicate misconfigured policies, a legitimate access change, or a potential security incident.

### Severity
**Warning** - Requires investigation within 1 hour

### Impact
- Legitimate service communication may be blocked
- Users may experience authorization errors
- Potential indicator of attack or misconfiguration

---

## Investigation Steps

### Step 1: Identify the Source of Denials

```bash
# Check OPA decision logs
kubectl logs -l app=opa -n policy --since=10m | grep "decision.*deny"

# Get detailed metrics from Prometheus
curl -s "http://prometheus.monitoring:9090/api/v1/query?query=topk(10,sum(rate(opa_decision_total{decision=\"deny\"}[5m]))by(source_service,destination_service))" | jq

# Check Istio access logs
kubectl logs -l istio=ingressgateway -n istio-system --since=10m | grep "response_code\":\"403\""
```

### Step 2: Analyze Communication Pattern

```bash
# Get source service details
kubectl get pods -l app=<source_service> -n <namespace> -o yaml

# Check service's SPIFFE ID
kubectl exec <pod> -n <namespace> -- cat /run/spire/svid/svid.crt | openssl x509 -text | grep URI

# Verify communication matrix entry exists
cat zero-trust/config/communication-matrix.yaml | yq '.data."matrix.yaml" | from_yaml | .rules[] | select(.source.service == "<source_service>")'
```

### Step 3: Check Policy Configuration

```bash
# Validate network policy
kubectl get networkpolicy -n <namespace> -o yaml

# Check Istio AuthorizationPolicy
kubectl get authorizationpolicy -n <namespace> -o yaml

# Verify OPA policy rules
kubectl get configmap opa-service-authz -n policy -o yaml
```

### Step 4: Test Connectivity

```bash
# From source pod, test connectivity
kubectl exec <source_pod> -n <namespace> -- curl -v https://<destination>:<port>/<path>

# Check mTLS certificate validity
kubectl exec <source_pod> -n <namespace> -- \
  openssl s_client -connect <destination>:<port> -showcerts 2>/dev/null | openssl x509 -text
```

---

## Resolution Procedures

### Scenario 1: Legitimate Communication Blocked

If this is a legitimate communication that should be allowed:

1. **Update Communication Matrix**
```yaml
# Add rule to zero-trust/config/communication-matrix.yaml
- name: new-service-communication
  source:
    service: <source_service>
    namespace: <source_namespace>
  destination:
    service: <destination_service>
    namespace: <destination_namespace>
  allow:
    methods: [GET, POST]
    paths: ["/api/*"]
```

2. **Update Network Policy**
```bash
# Edit network policy
kubectl edit networkpolicy <policy_name> -n <namespace>
```

3. **Update Istio AuthorizationPolicy**
```yaml
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: <service>-authz
  namespace: <namespace>
spec:
  selector:
    matchLabels:
      app: <destination_service>
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/<namespace>/sa/<source_service_account>
EOF
```

4. **Validate Changes**
```bash
# Run policy lint
./zero-trust/tools/policy-lint.sh

# Test connectivity
kubectl exec <source_pod> -n <namespace> -- curl -v https://<destination>:<port>/<path>
```

### Scenario 2: Potential Security Incident

If denials are unexpected and may indicate an attack:

1. **Isolate the Source**
```bash
# Apply deny-all policy to suspicious workload
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-suspicious-workload
  namespace: <namespace>
spec:
  podSelector:
    matchLabels:
      app: <suspicious_app>
  policyTypes:
    - Ingress
    - Egress
EOF
```

2. **Collect Evidence**
```bash
# Capture pod details
kubectl get pod <pod> -n <namespace> -o yaml > /tmp/evidence/pod-spec.yaml

# Get pod logs
kubectl logs <pod> -n <namespace> --all-containers > /tmp/evidence/pod-logs.txt

# Get network flow logs
kubectl logs -l app=cilium -n kube-system | grep <pod_ip> > /tmp/evidence/network-flows.txt
```

3. **Escalate to Security Team**
- Create incident ticket
- Notify security operations
- Preserve all evidence

### Scenario 3: Certificate/Identity Issue

If denials are caused by certificate problems:

1. **Check SVID Status**
```bash
# Check certificate validity
kubectl exec <pod> -n <namespace> -- \
  cat /run/spire/svid/svid.crt | openssl x509 -checkend 0

# Force SVID refresh
kubectl exec <pod> -n <namespace> -- \
  kill -HUP $(pgrep spire-agent)
```

2. **Verify SPIRE Agent**
```bash
# Check agent health
kubectl exec -n spire-system $(kubectl get pods -n spire-system -l app=spire-agent -o jsonpath='{.items[0].metadata.name}') -- \
  /opt/spire/bin/spire-agent healthcheck
```

---

## Prevention

1. **Policy Testing**: Always run `./zero-trust/tools/policy-lint.sh` before deploying changes
2. **Staged Rollout**: Deploy policy changes to staging before production
3. **Monitoring**: Set up dashboards to track policy decisions
4. **Documentation**: Update communication matrix when adding new service pairs

---

## Escalation

| Level | Team | Response Time |
|-------|------|---------------|
| L1 | Platform On-Call | 30 min |
| L2 | Platform Security | 1 hour |
| L3 | Security Operations | 2 hours |

---

## Related Documentation

- [Communication Matrix](../config/communication-matrix.yaml)
- [OPA Service Authorization Policy](../policies/opa/service-authz.rego)
- [Network Policy Reference](../policies/network/)
- [Zero-Trust Architecture Overview](../README.md)
