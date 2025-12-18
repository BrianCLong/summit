# mTLS Handshake Failures Runbook

## Alert: MTLSHandshakeFailureRateHigh

### Overview
This alert fires when mTLS handshake failures exceed 5% for a service over a 5-minute window. mTLS failures prevent secure service-to-service communication and indicate certificate or configuration issues.

### Severity
**Critical** - Requires immediate investigation

### Impact
- Service-to-service communication failures
- Potential security degradation
- Application errors and timeouts

---

## Investigation Steps

### Step 1: Check Certificate Status

```bash
# Get SVID expiry time
kubectl exec <pod> -n <namespace> -- \
  cat /run/spire/svid/svid.crt | openssl x509 -dates -noout

# Verify certificate chain
kubectl exec <pod> -n <namespace> -- \
  cat /run/spire/svid/svid.crt | openssl verify -CAfile /run/spire/bundle/bundle.crt

# Check SPIFFE ID in certificate
kubectl exec <pod> -n <namespace> -- \
  cat /run/spire/svid/svid.crt | openssl x509 -text | grep -A1 "Subject Alternative Name"
```

### Step 2: Verify SPIRE Health

```bash
# Check SPIRE server health
kubectl exec -n spire-system $(kubectl get pods -n spire-system -l app=spire-server -o jsonpath='{.items[0].metadata.name}') -- \
  /opt/spire/bin/spire-server healthcheck -socketPath /tmp/spire-server/private/api.sock

# Check SPIRE agent health
kubectl exec -n spire-system $(kubectl get pods -n spire-system -l app=spire-agent -o jsonpath='{.items[0].metadata.name}') -- \
  /opt/spire/bin/spire-agent healthcheck -socketPath /run/spire/sockets/agent.sock

# Check agent SVID status
kubectl logs -l app=spire-agent -n spire-system --since=10m | grep -i "svid\|error\|rotation"
```

### Step 3: Check Istio Configuration

```bash
# Verify PeerAuthentication is STRICT
kubectl get peerauthentication -A -o yaml | grep -A5 "mtls:"

# Check DestinationRule for mTLS
kubectl get destinationrule -n <namespace> -o yaml | grep -A5 "tls:"

# Check Istio proxy logs
kubectl logs <pod> -n <namespace> -c istio-proxy --since=10m | grep -i "tls\|certificate\|handshake"
```

### Step 4: Test mTLS Connection

```bash
# Test connection with certificates
kubectl exec <source_pod> -n <namespace> -- \
  curl -v --cacert /run/spire/bundle/bundle.crt \
       --cert /run/spire/svid/svid.crt \
       --key /run/spire/svid/svid.key \
       https://<destination>:<port>/health

# Test through Envoy proxy
kubectl exec <source_pod> -n <namespace> -- \
  curl -v http://localhost:15000/clusters | grep <destination>
```

---

## Resolution Procedures

### Scenario 1: Expired Certificate

```bash
# Force certificate rotation
kubectl exec <pod> -n <namespace> -- \
  kill -HUP $(pgrep spire-agent 2>/dev/null || echo 1)

# Or restart the pod
kubectl delete pod <pod> -n <namespace>

# Verify new certificate
kubectl exec <new_pod> -n <namespace> -- \
  cat /run/spire/svid/svid.crt | openssl x509 -dates -noout
```

### Scenario 2: SPIRE Agent Issues

```bash
# Restart SPIRE agent on affected node
kubectl delete pod -l app=spire-agent -n spire-system --field-selector spec.nodeName=<node>

# Check agent logs after restart
kubectl logs -l app=spire-agent -n spire-system -f
```

### Scenario 3: Trust Bundle Mismatch

```bash
# Sync trust bundle
kubectl get configmap spire-bundle -n spire-system -o yaml

# Force bundle update
kubectl annotate configmap spire-bundle -n spire-system \
  force-sync=$(date +%s) --overwrite

# Restart affected workloads
kubectl rollout restart deployment/<deployment> -n <namespace>
```

### Scenario 4: Istio Configuration Issue

```bash
# Reset PeerAuthentication to STRICT
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: <namespace>
spec:
  mtls:
    mode: STRICT
EOF

# Verify DestinationRule
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: <service>
  namespace: <namespace>
spec:
  host: <service>.<namespace>.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
EOF
```

### Scenario 5: Network Issues

```bash
# Check if SPIRE server is reachable
kubectl exec <pod> -n <namespace> -- \
  nc -zv spire-server.spire-system.svc.cluster.local 8081

# Check if port 15012 (Istio CA) is reachable
kubectl exec <pod> -n <namespace> -- \
  nc -zv istiod.istio-system.svc.cluster.local 15012
```

---

## Verification

After applying fixes:

```bash
# Verify mTLS is working
kubectl exec <pod> -n <namespace> -- \
  curl -s http://localhost:15000/stats | grep "ssl.handshake"

# Check successful connections
kubectl exec <pod> -n <namespace> -- \
  curl -s http://localhost:15000/clusters | grep "cx_total"

# Monitor for new failures
watch -n 5 'kubectl logs <pod> -n <namespace> -c istio-proxy --tail=10 | grep -i error'
```

---

## Prevention

1. **Certificate Monitoring**: Set alerts for certificates expiring within 24 hours
2. **SPIRE Health Checks**: Regular health checks for SPIRE server and agents
3. **Trust Bundle Sync**: Ensure trust bundles are synchronized across clusters
4. **Gradual mTLS Rollout**: Use PERMISSIVE mode during transitions

---

## Escalation

| Level | Team | Response Time |
|-------|------|---------------|
| L1 | Platform On-Call | 15 min |
| L2 | Platform Security | 30 min |
| L3 | Infrastructure | 1 hour |

---

## Related Documentation

- [SPIRE Configuration](../identity/spire/)
- [Istio mTLS Policies](../policies/istio/peer-authentication.yaml)
- [Certificate Rotation](../identity/spire/server.yaml)
