# ADR-025: Migration from ingress-nginx to Kubernetes Gateway API

**Status:** Proposed
**Date:** 2026-01-31
**Authors:** Platform Engineering
**Deciders:** SRE, Platform, Security

## Context

The Summit/IntelGraph platform currently uses **ingress-nginx** as the primary ingress controller for external traffic management. The Kubernetes Gateway API has reached GA status (v1.0+) and offers significant advantages over the legacy Ingress API.

### Current State

**Ingress Controller:** ingress-nginx
**Deployment Method:** Helmfile + ArgoCD
**Namespace:** `ingress-nginx`

**Files Affected:**
| Category | Count | Location |
|----------|-------|----------|
| Ingress manifests | 6 | `k8s/ingress/`, `infra/k8s/ingress/` |
| Helm templates | 7 | `helm/*/templates/ingress.yaml` |
| Helm values | 5+ | `helm/*/values.yaml`, `deploy/*/values.yaml` |
| Network policies | 5 | Various locations referencing `ingress-nginx` namespace |
| Helmfile | 1 | `deploy/helmfile/helmfile.yaml` |
| ArgoCD apps | 2 | `deploy/argocd/` |

### Nginx-Specific Features in Use

1. **Rate Limiting**
   - `nginx.ingress.kubernetes.io/limit-rps: "10"`
   - `nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"`
   - `nginx.ingress.kubernetes.io/limit-rpm: "100"`

2. **Security**
   - `nginx.ingress.kubernetes.io/enable-modsecurity: "true"`
   - `nginx.ingress.kubernetes.io/whitelist-source-range`
   - Configuration snippets for security headers

3. **Canary Deployments**
   - `nginx.ingress.kubernetes.io/canary: "true"`
   - `nginx.ingress.kubernetes.io/canary-weight: "10"`
   - Header-based routing

4. **SSL/TLS**
   - cert-manager integration via annotations
   - `nginx.ingress.kubernetes.io/ssl-redirect: "true"`

5. **CORS**
   - `nginx.ingress.kubernetes.io/enable-cors: "true"`
   - `nginx.ingress.kubernetes.io/cors-allow-origin`

## Decision

Migrate from ingress-nginx to **Kubernetes Gateway API** using a compatible implementation.

### Gateway API Implementation Options

| Implementation | Pros | Cons |
|---------------|------|------|
| **Envoy Gateway** | CNCF, feature-rich, Envoy proxy | Newer, less battle-tested |
| **Istio Gateway** | Already have Istio mesh | Adds complexity if not using mesh |
| **Contour** | Mature, Envoy-based | Separate project maintenance |
| **NGINX Gateway Fabric** | Familiar nginx config model | Nginx-specific |
| **Traefik** | Already in use for some routes | Different config model |

**Recommendation:** **Envoy Gateway** - provides a clean Gateway API implementation with strong CNCF backing and excellent feature parity.

## Migration Strategy

### Phase 1: Preparation (Week 1-2)

1. **Install Gateway API CRDs**
   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
   ```

2. **Deploy Envoy Gateway alongside ingress-nginx**
   - Parallel operation for gradual migration
   - Separate IP/LoadBalancer initially

3. **Create GatewayClass resource**
   ```yaml
   apiVersion: gateway.networking.k8s.io/v1
   kind: GatewayClass
   metadata:
     name: envoy
   spec:
     controllerName: gateway.envoyproxy.io/gatewayclass-controller
   ```

### Phase 2: Gateway Resources (Week 3-4)

1. **Create Gateway resource**
   ```yaml
   apiVersion: gateway.networking.k8s.io/v1
   kind: Gateway
   metadata:
     name: summit-gateway
     namespace: envoy-gateway-system
   spec:
     gatewayClassName: envoy
     listeners:
       - name: http
         protocol: HTTP
         port: 80
       - name: https
         protocol: HTTPS
         port: 443
         tls:
           mode: Terminate
           certificateRefs:
             - kind: Secret
               name: summit-tls
   ```

2. **Configure TLS with cert-manager**
   - Update Certificate resources to reference Gateway
   - Use Gateway API TLS configuration

### Phase 3: Route Migration (Week 5-8)

Convert each Ingress to HTTPRoute:

**Before (Ingress):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
spec:
  ingressClassName: nginx
  rules:
    - host: app.intelgraph.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

**After (HTTPRoute):**
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web
spec:
  parentRefs:
    - name: summit-gateway
      namespace: envoy-gateway-system
  hostnames:
    - app.intelgraph.io
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web
          port: 80
```

### Phase 4: Advanced Features (Week 9-12)

#### Rate Limiting → BackendTrafficPolicy
```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: rate-limit-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: web
  rateLimit:
    type: Local
    local:
      rules:
        - limit:
            requests: 10
            unit: Second
```

#### Canary Deployments → HTTPRoute Weights
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-canary
spec:
  parentRefs:
    - name: summit-gateway
  hostnames:
    - app.intelgraph.io
  rules:
    - backendRefs:
        - name: web-stable
          port: 80
          weight: 90
        - name: web-canary
          port: 80
          weight: 10
```

#### Header-Based Routing
```yaml
rules:
  - matches:
      - headers:
          - name: X-Canary
            value: "true"
    backendRefs:
      - name: web-canary
        port: 80
```

### Phase 5: Cutover (Week 13-14)

1. **DNS Migration**
   - Update DNS to point to Gateway LoadBalancer IP
   - Keep ingress-nginx running for rollback

2. **Monitoring**
   - Compare metrics between old and new paths
   - Alert on latency/error rate differences

3. **Cleanup**
   - Remove ingress-nginx after 2-week bake period
   - Delete legacy Ingress resources

## Migration Mapping

### Annotation Equivalents

| nginx-ingress Annotation | Gateway API Equivalent |
|-------------------------|------------------------|
| `limit-rps` | BackendTrafficPolicy.rateLimit |
| `limit-rpm` | BackendTrafficPolicy.rateLimit |
| `ssl-redirect` | Gateway listener redirect policy |
| `canary`, `canary-weight` | HTTPRoute backendRefs weights |
| `canary-by-header` | HTTPRoute matches.headers |
| `whitelist-source-range` | SecurityPolicy.authorization |
| `enable-cors` | SecurityPolicy.cors |
| `cors-allow-origin` | SecurityPolicy.cors.allowOrigins |
| `proxy-body-size` | BackendTrafficPolicy.uploadTimeout |
| `proxy-read-timeout` | BackendTrafficPolicy.timeout |

### Files to Update

#### Helm Templates
| Current File | New File |
|-------------|----------|
| `helm/sandbox-gateway/templates/ingress.yaml` | `helm/sandbox-gateway/templates/httproute.yaml` |
| `helm/server/templates/ingress.yaml` | `helm/server/templates/httproute.yaml` |
| `helm/client/templates/ingress.yaml` | `helm/client/templates/httproute.yaml` |
| `helm/intelgraph/templates/ingress.yaml` | `helm/intelgraph/templates/httproute.yaml` |

#### Raw Manifests
| Current File | Action |
|-------------|--------|
| `k8s/ingress/web.yaml` | Convert to HTTPRoute |
| `k8s/ingress/web-canary.yaml` | Merge into weighted HTTPRoute |
| `k8s/ingress/web-header-canary.yaml` | Convert to header-match HTTPRoute |
| `infra/k8s/ingress/maestro-ingress.yaml` | Convert to HTTPRoute + policies |

#### Network Policies
Update `namespaceSelector` from `ingress-nginx` to `envoy-gateway-system`:
- `infra/k8s/namespaces/orchestrator-namespaces.yaml`
- `infra/registry/policies/network-policy.yaml`
- `infra/helm/intelgraph/templates/network-policy.yaml`
- `SECURITY/container/security-policies.yaml`
- `deploy/maestro/networkpolicy.yaml`

#### Helmfile/ArgoCD
- `deploy/helmfile/helmfile.yaml` - Replace ingress-nginx release with envoy-gateway
- `deploy/argocd/app-of-apps.yaml` - Update ingress-nginx app to envoy-gateway
- `deploy/argocd/projects/companyos-project.yaml` - Update allowed sources

## Rollback Strategy

1. **Instant Rollback (DNS)**
   - Revert DNS to ingress-nginx LoadBalancer IP
   - Takes effect within TTL (typically 5 minutes)

2. **Parallel Operation**
   - Keep ingress-nginx running during migration
   - Both controllers can coexist with different IngressClass/GatewayClass

3. **Feature Flags**
   - Helm values to toggle between Ingress and HTTPRoute templates
   - Gradual service-by-service migration

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Feature parity gaps | Medium | Pre-migration feature audit, use extension policies |
| Performance regression | High | Load testing before cutover, parallel monitoring |
| TLS certificate issues | High | Test cert-manager integration in staging |
| Canary deployment breaks | Medium | Thorough testing of weighted routing |
| Network policy failures | High | Update policies before DNS cutover |

## Success Criteria

1. All services reachable via Gateway API routes
2. Rate limiting functioning correctly (load test verification)
3. Canary deployments working (staged rollout test)
4. TLS certificates auto-renewed
5. Latency P99 within 5% of ingress-nginx baseline
6. Zero unplanned downtime during migration

## Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Preparation | 2 weeks | Gateway API CRDs + Envoy Gateway deployed |
| Gateway Setup | 2 weeks | TLS configured, basic routes working |
| Route Migration | 4 weeks | All HTTPRoutes created, parallel testing |
| Advanced Features | 4 weeks | Rate limiting, canary, security policies |
| Cutover | 2 weeks | DNS migration, monitoring, cleanup |
| **Total** | **14 weeks** | Full migration complete |

## References

- [Kubernetes Gateway API Docs](https://gateway-api.sigs.k8s.io/)
- [Envoy Gateway](https://gateway.envoyproxy.io/)
- [Gateway API v1.2.0 Release](https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.2.0)
- [Migration Guide from Ingress](https://gateway-api.sigs.k8s.io/guides/migrating-from-ingress/)

## Appendix: Affected Files Inventory

```
# Ingress Resources
k8s/ingress/web.yaml
k8s/ingress/web-canary.yaml
k8s/ingress/web-header-canary.yaml
k8s/ingress/cdn-annotations.yaml
k8s/maestro-ingress.yaml
infra/k8s/ingress/maestro-ingress.yaml

# Helm Templates
helm/sandbox-gateway/templates/ingress.yaml
helm/server/templates/ingress.yaml
helm/client/templates/ingress.yaml
helm/intelgraph/templates/ingress.yaml

# Helm Values
helm/sandbox-gateway/values.yaml
helm/server/values.yaml
helm/client/values.yaml
deploy/prod/values.yaml

# Network Policies (namespace references)
infra/k8s/namespaces/orchestrator-namespaces.yaml
infra/registry/policies/network-policy.yaml
infra/helm/intelgraph/templates/network-policy.yaml
SECURITY/container/security-policies.yaml
deploy/maestro/networkpolicy.yaml

# Deployment Orchestration
deploy/helmfile/helmfile.yaml
deploy/argocd/app-of-apps.yaml
deploy/argocd/projects/companyos-project.yaml
```
