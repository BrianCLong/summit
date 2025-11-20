# Container and Kubernetes Troubleshooting Guide

> **Last Updated**: 2025-11-20
> **Purpose**: Quick reference for diagnosing and resolving container and orchestration issues

## Quick Diagnostic Commands

```bash
# Pod status and events
kubectl get pods -n <namespace> -o wide
kubectl describe pod <pod-name> -n <namespace>
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Logs
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous
kubectl logs <pod-name> -c <container-name> -n <namespace>
kubectl logs -f <pod-name> -n <namespace> --tail=100

# Resource usage
kubectl top pods -n <namespace>
kubectl top nodes

# HPA and scaling
kubectl get hpa -n <namespace>
kubectl describe hpa <hpa-name> -n <namespace>

# Network debugging
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh
kubectl port-forward <pod-name> 8080:80 -n <namespace>
```

## Common Issues and Solutions

### 1. Pod Stuck in Pending

**Symptoms**:
- Pod status: `Pending`
- No containers running

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n <namespace>
```

**Common Causes**:

#### Insufficient Resources
```
Events:
  Warning  FailedScheduling  pod didn't trigger scale-up (not enough cpu)
```
**Solution**:
- Scale up cluster or add nodes
- Reduce resource requests
- Check resource quotas: `kubectl describe resourcequota -n <namespace>`

#### PVC Not Bound
```
Events:
  Warning  FailedMount  unable to mount volume
```
**Solution**:
```bash
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
# Check storage class exists
kubectl get storageclass
```

#### Node Selector/Affinity Not Satisfied
```
Events:
  Warning  FailedScheduling  0/3 nodes are available: 3 node(s) didn't match Pod's node affinity
```
**Solution**:
- Check node labels: `kubectl get nodes --show-labels`
- Update pod affinity or add labels to nodes

### 2. CrashLoopBackOff

**Symptoms**:
- Pod status: `CrashLoopBackOff`
- Container repeatedly restarting

**Diagnosis**:
```bash
kubectl logs <pod-name> -n <namespace> --previous
kubectl describe pod <pod-name> -n <namespace>
```

**Common Causes**:

#### Application Error
**Check logs for**:
- Uncaught exceptions
- Missing environment variables
- Database connection failures

**Solution**:
```bash
# Check environment variables
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].env}'

# Check secrets
kubectl get secret <secret-name> -n <namespace> -o yaml

# Test locally
docker run --rm -it <image> /bin/sh
```

#### Health Check Failure
```
Liveness probe failed: HTTP probe failed with statuscode: 503
```
**Solution**:
- Verify health check endpoint works
- Increase `initialDelaySeconds` or `failureThreshold`
- Check app startup time
```yaml
livenessProbe:
  initialDelaySeconds: 60  # Increase
  failureThreshold: 5      # Increase
```

#### Missing Dependencies
**Solution**:
```bash
# Check init containers
kubectl logs <pod-name> -c <init-container-name> -n <namespace>

# Test connectivity to dependencies
kubectl exec -it <pod-name> -n <namespace> -- nc -zv postgres 5432
kubectl exec -it <pod-name> -n <namespace> -- nc -zv redis 6379
```

### 3. ImagePullBackOff

**Symptoms**:
- Pod status: `ImagePullBackOff` or `ErrImagePull`
- Cannot pull container image

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Events"
```

**Common Causes**:

#### Image Doesn't Exist
```
Failed to pull image "ghcr.io/user/app:tag": rpc error: code = NotFound
```
**Solution**:
```bash
# Verify image exists
docker pull ghcr.io/user/app:tag

# Check image name and tag
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].image}'

# List available tags
curl -H "Authorization: Bearer $TOKEN" https://ghcr.io/v2/user/app/tags/list
```

#### Authentication Failed
```
Failed to pull image: unauthorized: authentication required
```
**Solution**:
```bash
# Check image pull secret exists
kubectl get secrets -n <namespace> | grep docker

# Verify secret is correct
kubectl get secret <secret-name> -n <namespace> -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token> \
  -n <namespace>

# Update deployment to use secret
spec:
  imagePullSecrets:
  - name: ghcr-secret
```

#### Rate Limiting
```
toomanyrequests: You have reached your pull rate limit
```
**Solution**:
- Use authenticated pulls
- Implement image caching/registry proxy
- Spread pulls across time

### 4. Pod Running but Not Ready

**Symptoms**:
- Pod status: `Running`
- Ready: `0/1`
- Not receiving traffic

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n <namespace> | grep -A 20 "Conditions"
kubectl logs <pod-name> -n <namespace>
```

**Common Causes**:

#### Readiness Probe Failing
```
Readiness probe failed: HTTP probe failed with statuscode: 503
```
**Solution**:
```bash
# Test health endpoint manually
kubectl exec -it <pod-name> -n <namespace> -- curl http://localhost:4000/health/ready

# Check what readiness probe checks
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 readinessProbe

# Adjust probe configuration
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4000
  initialDelaySeconds: 30  # Give more time
  periodSeconds: 10
  timeoutSeconds: 5       # Increase if needed
  failureThreshold: 3
```

#### Dependencies Not Ready
**Solution**:
```bash
# Check dependency status
kubectl get pods -n <namespace> -l app=postgres
kubectl get pods -n <namespace> -l app=redis

# Test connectivity
kubectl exec -it <pod-name> -n <namespace> -- telnet postgres 5432
kubectl exec -it <pod-name> -n <namespace> -- redis-cli -h redis ping
```

### 5. High CPU/Memory Usage

**Symptoms**:
- Pods being OOMKilled
- CPU throttling
- Slow performance

**Diagnosis**:
```bash
kubectl top pods -n <namespace>
kubectl top nodes
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Limits"
```

**Common Causes**:

#### Memory Limit Too Low
```
Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137
```
**Solution**:
```bash
# Check current limits
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].resources}'

# Increase limits
resources:
  requests:
    memory: 512Mi  # Baseline
  limits:
    memory: 2Gi    # Increase this
```

#### CPU Throttling
```bash
# Check CPU usage vs limit
kubectl top pod <pod-name> -n <namespace>
```
**Solution**:
```yaml
resources:
  requests:
    cpu: 500m      # Increase
  limits:
    cpu: 2000m     # Increase
```

#### Memory Leak
**Solution**:
- Enable heap profiling
- Analyze with profiling tools
- Update application code

### 6. HPA Not Scaling

**Symptoms**:
- HPA shows `<unknown>` for metrics
- Pods not scaling despite load

**Diagnosis**:
```bash
kubectl get hpa -n <namespace>
kubectl describe hpa <hpa-name> -n <namespace>
kubectl get apiservices | grep metrics
```

**Common Causes**:

#### Metrics Server Not Installed
```
unable to get metrics for resource cpu: no metrics returned from resource metrics API
```
**Solution**:
```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify metrics-server is running
kubectl get deployment metrics-server -n kube-system
kubectl top nodes  # Should work if installed correctly
```

#### Custom Metrics Not Available
```
unable to get external metric: unable to fetch metrics from external metrics API
```
**Solution**:
```bash
# Check prometheus-adapter
kubectl get pods -n monitoring | grep prometheus-adapter

# Check custom metrics API
kubectl get apiservices | grep custom.metrics

# Verify metrics are exposed
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1
```

#### Resource Requests Not Set
**HPA requires resource requests to be defined**
```yaml
resources:
  requests:
    cpu: 250m      # Required for CPU-based HPA
    memory: 512Mi  # Required for memory-based HPA
```

### 7. Network Issues

**Symptoms**:
- Pods can't communicate
- Connection timeouts
- DNS resolution failures

**Diagnosis**:
```bash
# Test DNS
kubectl exec -it <pod-name> -n <namespace> -- nslookup kubernetes.default
kubectl exec -it <pod-name> -n <namespace> -- nslookup <service-name>

# Test connectivity
kubectl exec -it <pod-name> -n <namespace> -- curl http://<service-name>:80
kubectl exec -it <pod-name> -n <namespace> -- telnet <service-name> 80

# Check service endpoints
kubectl get endpoints <service-name> -n <namespace>
kubectl describe service <service-name> -n <namespace>
```

**Common Causes**:

#### Network Policy Blocking
```bash
# Check network policies
kubectl get networkpolicy -n <namespace>
kubectl describe networkpolicy <policy-name> -n <namespace>

# Temporarily allow all (testing only)
kubectl delete networkpolicy --all -n <namespace>
```

#### Service Selector Mismatch
```bash
# Check service selector
kubectl get service <service-name> -n <namespace> -o jsonpath='{.spec.selector}'

# Check pod labels
kubectl get pods -n <namespace> --show-labels

# Ensure they match
```

#### DNS Issues
```bash
# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default
```

### 8. Persistent Volume Issues

**Symptoms**:
- PVC stuck in `Pending`
- Mount failures
- Permission denied errors

**Diagnosis**:
```bash
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
kubectl get pv
kubectl describe pv <pv-name>
```

**Common Causes**:

#### No Available PV
```bash
# Check storage classes
kubectl get storageclass

# Check if dynamic provisioning is enabled
kubectl get storageclass <class-name> -o yaml | grep provisioner

# Create PV manually or enable dynamic provisioning
```

#### Permission Issues
```
chown: changing ownership of '/data': Operation not permitted
```
**Solution**:
```yaml
spec:
  securityContext:
    fsGroup: 1001  # Must match volume ownership
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: my-pvc
```

### 9. Build Issues

**Symptoms**:
- Docker build fails
- Slow builds
- Layer caching not working

**Common Causes**:

#### Build Context Too Large
```bash
# Check context size
du -sh .

# Optimize with .dockerignore
cat > .dockerignore <<EOF
node_modules/
.git/
*.md
tests/
EOF
```

#### Dependency Installation Fails
```bash
# Enable BuildKit for better error messages
DOCKER_BUILDKIT=1 docker build -t myapp:tag .

# Build specific stage for debugging
docker build --target builder -t myapp:debug .
docker run -it myapp:debug /bin/sh
```

#### Multi-platform Build Fails
```bash
# Setup buildx
docker buildx create --name multiplatform --use
docker buildx inspect --bootstrap

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:tag .
```

## Debugging Workflows

### Pod Debugging Workflow

```bash
# 1. Check pod status
kubectl get pod <pod-name> -n <namespace> -o wide

# 2. Check events
kubectl describe pod <pod-name> -n <namespace> | grep -A 20 "Events"

# 3. Check logs
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous

# 4. Check resource usage
kubectl top pod <pod-name> -n <namespace>

# 5. Check configuration
kubectl get pod <pod-name> -n <namespace> -o yaml

# 6. Execute commands in pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# 7. Check network
kubectl exec -it <pod-name> -n <namespace> -- netstat -tuln
kubectl exec -it <pod-name> -n <namespace> -- ss -tuln
```

### Service Debugging Workflow

```bash
# 1. Check service
kubectl get service <service-name> -n <namespace>

# 2. Check endpoints
kubectl get endpoints <service-name> -n <namespace>

# 3. Verify selector matches pods
kubectl describe service <service-name> -n <namespace> | grep Selector
kubectl get pods -n <namespace> --show-labels

# 4. Test from another pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://<service-name>.<namespace>.svc.cluster.local:80

# 5. Check network policies
kubectl get networkpolicy -n <namespace>
```

### Performance Debugging Workflow

```bash
# 1. Check resource usage
kubectl top pods -n <namespace>
kubectl top nodes

# 2. Check HPA status
kubectl get hpa -n <namespace>
kubectl describe hpa <hpa-name> -n <namespace>

# 3. Check for throttling
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Limits"

# 4. Check metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/<namespace>/pods/<pod-name>

# 5. Profile application
kubectl port-forward <pod-name> 6060:6060 -n <namespace>
# Access profiling endpoint at http://localhost:6060/debug/pprof/
```

## Emergency Procedures

### Rolling Back a Deployment

```bash
# Check rollout history
kubectl rollout history deployment/<deployment-name> -n <namespace>

# Rollback to previous version
kubectl rollout undo deployment/<deployment-name> -n <namespace>

# Rollback to specific revision
kubectl rollout undo deployment/<deployment-name> --to-revision=2 -n <namespace>

# Check rollout status
kubectl rollout status deployment/<deployment-name> -n <namespace>
```

### Force Deleting Stuck Pods

```bash
# Delete with grace period
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force

# Remove finalizers if still stuck
kubectl patch pod <pod-name> -n <namespace> -p '{"metadata":{"finalizers":null}}'
```

### Draining a Node

```bash
# Cordon node (prevent new pods)
kubectl cordon <node-name>

# Drain node (evict pods)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Uncordon when ready
kubectl uncordon <node-name>
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Pod Health**
   - Pod restarts
   - CrashLoopBackOff count
   - Pending pods

2. **Resource Usage**
   - CPU utilization
   - Memory utilization
   - Disk I/O

3. **Network**
   - Request rate
   - Error rate
   - Latency (P50, P95, P99)

4. **Scaling**
   - HPA current replicas vs desired
   - Node capacity
   - PDB violations

### Prometheus Queries

```promql
# Pod restart rate
rate(kube_pod_container_status_restarts_total[5m]) > 0

# Memory usage percentage
container_memory_usage_bytes / container_spec_memory_limit_bytes * 100 > 80

# CPU throttling
rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0

# Pod pending
kube_pod_status_phase{phase="Pending"} > 0

# Failed health checks
rate(kubelet_http_requests_duration_seconds_count{path=~".*health.*"}[5m])
```

## Additional Resources

- [Kubernetes Troubleshooting Documentation](https://kubernetes.io/docs/tasks/debug-application-cluster/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Container Debug Tools](https://github.com/nicolaka/netshoot)

---

**Maintained by**: IntelGraph Infrastructure Team
**Last Review**: 2025-11-20
