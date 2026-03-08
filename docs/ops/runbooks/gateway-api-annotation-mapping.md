# Gateway API Annotation Mapping Reference

**Purpose:** Quick reference for converting nginx-ingress annotations to Gateway API resources
**Related ADR:** ADR-025-ingress-nginx-to-gateway-api-migration.md

## Quick Reference Table

| nginx-ingress Annotation | Gateway API Resource | Field/Configuration |
|-------------------------|---------------------|---------------------|
| `kubernetes.io/ingress.class: nginx` | Gateway | `spec.gatewayClassName` |
| `nginx.ingress.kubernetes.io/ssl-redirect` | Gateway | Listener redirect or HTTPRoute filter |
| `nginx.ingress.kubernetes.io/force-ssl-redirect` | HTTPRoute | RequestRedirect filter |
| `nginx.ingress.kubernetes.io/backend-protocol` | HTTPRoute | `backendRefs[].protocol` (GRPCRoute for gRPC) |
| `nginx.ingress.kubernetes.io/rewrite-target` | HTTPRoute | URLRewrite filter |
| `nginx.ingress.kubernetes.io/use-regex` | HTTPRoute | `matches[].path.type: RegularExpression` |
| `nginx.ingress.kubernetes.io/canary` | HTTPRoute | Multiple `backendRefs` with weights |
| `nginx.ingress.kubernetes.io/canary-weight` | HTTPRoute | `backendRefs[].weight` |
| `nginx.ingress.kubernetes.io/canary-by-header` | HTTPRoute | `matches[].headers` |
| `nginx.ingress.kubernetes.io/limit-rps` | BackendTrafficPolicy | `rateLimit.local.rules` |
| `nginx.ingress.kubernetes.io/limit-rpm` | BackendTrafficPolicy | `rateLimit.local.rules` |
| `nginx.ingress.kubernetes.io/limit-connections` | BackendTrafficPolicy | `connectionLimit` |
| `nginx.ingress.kubernetes.io/proxy-connect-timeout` | BackendTrafficPolicy | `timeout.tcp.connectTimeout` |
| `nginx.ingress.kubernetes.io/proxy-read-timeout` | BackendTrafficPolicy | `timeout.http.requestTimeout` |
| `nginx.ingress.kubernetes.io/proxy-send-timeout` | BackendTrafficPolicy | `timeout.http.requestTimeout` |
| `nginx.ingress.kubernetes.io/proxy-body-size` | BackendTrafficPolicy | `clientTrafficPolicy.clientMaxBodySize` |
| `nginx.ingress.kubernetes.io/whitelist-source-range` | SecurityPolicy | `authorization.rules` |
| `nginx.ingress.kubernetes.io/enable-cors` | SecurityPolicy | `cors` |
| `nginx.ingress.kubernetes.io/cors-allow-origin` | SecurityPolicy | `cors.allowOrigins` |
| `nginx.ingress.kubernetes.io/cors-allow-methods` | SecurityPolicy | `cors.allowMethods` |
| `nginx.ingress.kubernetes.io/cors-allow-headers` | SecurityPolicy | `cors.allowHeaders` |
| `nginx.ingress.kubernetes.io/cors-max-age` | SecurityPolicy | `cors.maxAge` |
| `nginx.ingress.kubernetes.io/auth-url` | SecurityPolicy | `extAuth.http.url` |
| `nginx.ingress.kubernetes.io/auth-signin` | SecurityPolicy | `extAuth.http.headersToBackend` |
| `nginx.ingress.kubernetes.io/enable-modsecurity` | SecurityPolicy | WAF policy (implementation-specific) |

---

## Detailed Conversion Examples

### 1. Basic Ingress → HTTPRoute

**Before:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: app.intelgraph.io
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
```

**After:**
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
            value: /api
      backendRefs:
        - name: api-server
          port: 8080
```

---

### 2. Rate Limiting

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-rps: "10"
  nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
```

**After (Envoy Gateway):**
```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: rate-limit
  namespace: default
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
          clientSelectors:
            - headers:
                - name: x-user-id
                  type: Distinct
```

---

### 3. Canary Deployment (Weight-Based)

**Before:**
```yaml
# Primary ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  rules:
    - host: app.intelgraph.io
      http:
        paths:
          - path: /
            backend:
              service:
                name: web-stable
                port: 80
---
# Canary ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
    - host: app.intelgraph.io
      http:
        paths:
          - path: /
            backend:
              service:
                name: web-canary
                port: 80
```

**After (Single HTTPRoute):**
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web
spec:
  parentRefs:
    - name: summit-gateway
  hostnames:
    - app.intelgraph.io
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web-stable
          port: 80
          weight: 90
        - name: web-canary
          port: 80
          weight: 10
```

---

### 4. Header-Based Canary

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
  nginx.ingress.kubernetes.io/canary-by-header-value: "true"
```

**After:**
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web
spec:
  parentRefs:
    - name: summit-gateway
  hostnames:
    - app.intelgraph.io
  rules:
    # Canary route (higher priority due to header match)
    - matches:
        - path:
            type: PathPrefix
            value: /
          headers:
            - name: X-Canary
              value: "true"
      backendRefs:
        - name: web-canary
          port: 80
    # Default route
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web-stable
          port: 80
```

---

### 5. CORS Configuration

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.intelgraph.io"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
  nginx.ingress.kubernetes.io/cors-allow-headers: "Content-Type, Authorization"
  nginx.ingress.kubernetes.io/cors-max-age: "86400"
```

**After (Envoy Gateway):**
```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: SecurityPolicy
metadata:
  name: cors-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: web
  cors:
    allowOrigins:
      - type: Exact
        value: "https://app.intelgraph.io"
    allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowHeaders:
      - Content-Type
      - Authorization
    maxAge: 86400s
```

---

### 6. IP Whitelist / Authorization

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
```

**After (Envoy Gateway):**
```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: SecurityPolicy
metadata:
  name: ip-allowlist
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: web
  authorization:
    defaultAction: Deny
    rules:
      - action: Allow
        principal:
          clientCIDRs:
            - cidr: 10.0.0.0/8
            - cidr: 192.168.0.0/16
```

---

### 7. TLS Configuration

**Before:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - app.intelgraph.io
      secretName: app-tls
  rules:
    - host: app.intelgraph.io
```

**After:**
```yaml
# Gateway with TLS listener
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: summit-gateway
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  gatewayClassName: envoy
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: app.intelgraph.io
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: app-tls
    - name: http-redirect
      protocol: HTTP
      port: 80
      hostname: app.intelgraph.io
---
# HTTPRoute with redirect
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: http-redirect
spec:
  parentRefs:
    - name: summit-gateway
      sectionName: http-redirect
  rules:
    - filters:
        - type: RequestRedirect
          requestRedirect:
            scheme: https
            statusCode: 301
```

---

### 8. URL Rewrite

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
    - http:
        paths:
          - path: /api(/|$)(.*)
            pathType: Prefix
```

**After:**
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-rewrite
spec:
  parentRefs:
    - name: summit-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /
      backendRefs:
        - name: api-server
          port: 8080
```

---

### 9. Timeouts

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
  nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
```

**After (Envoy Gateway):**
```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: timeout-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: web
  timeout:
    tcp:
      connectTimeout: 10s
    http:
      requestTimeout: 60s
      idleTimeout: 3600s
```

---

### 10. gRPC Backend

**Before:**
```yaml
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
```

**After:**
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-service
spec:
  parentRefs:
    - name: summit-gateway
  hostnames:
    - grpc.intelgraph.io
  rules:
    - matches:
        - method:
            service: mypackage.MyService
      backendRefs:
        - name: grpc-server
          port: 9090
```

---

## Feature Gaps and Workarounds

### Features Requiring Extension Policies

| Feature | nginx Annotation | Gateway API Solution |
|---------|-----------------|---------------------|
| ModSecurity/WAF | `enable-modsecurity` | Envoy WAF filter or external WAF |
| Custom error pages | `default-backend` | Envoy error response filter |
| Request mirroring | N/A | HTTPRoute `RequestMirror` filter |
| Session affinity | `affinity: cookie` | BackendTrafficPolicy `sessionPersistence` |
| Upstream hashing | `upstream-hash-by` | BackendTrafficPolicy `consistentHash` |

### Features Not Yet Supported in Gateway API Core

1. **Configuration snippets** - Use implementation-specific extensions
2. **Lua scripting** - Not supported; use Envoy filters or external processing
3. **ModSecurity** - Requires WAF integration at implementation level

---

## Validation Checklist

After each migration, verify:

- [ ] Service reachable via new HTTPRoute
- [ ] TLS certificate serving correctly
- [ ] Rate limiting functioning (load test)
- [ ] CORS headers present in responses
- [ ] Canary routing working (if applicable)
- [ ] IP restrictions enforced
- [ ] Timeouts configured correctly
- [ ] Metrics/observability working

## References

- [Gateway API HTTPRoute Spec](https://gateway-api.sigs.k8s.io/references/spec/#gateway.networking.k8s.io/v1.HTTPRoute)
- [Envoy Gateway Policies](https://gateway.envoyproxy.io/latest/tasks/traffic/)
- [nginx-ingress Annotations Reference](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
