# API Gateway and Reverse Proxy Blueprint

This blueprint delivers production-ready configuration for Kong and Traefik to front the Summit services with consistent routing, load balancing, circuit breaking, API versioning, authentication, and API composition. Use it to ship a hardened edge quickly and keep behavior portable between ingress controllers.

## Deployment options
- **Kong** (DB-less, `ops/gateway/kong/kong.yaml`): declarative routes, upstreams with health checks and passive circuit breaking, JWT/OIDC auth, rate limiting, CORS, and response/transform middleware.
- **Traefik** (Helm values + dynamic CRDs): entrypoints with TLS, version-aware `IngressRoute` definitions, middleware chains for auth/rate limiting, load-balanced services with circuit breaker expressions, and weighted canaries.

## Routing & API versioning
- Prefix routes by API version (e.g., `/api/v1`, `/api/v2`) and service domain (catalog, orders, users).
- Default `latest` alias points to the newest stable version; explicit version paths stay backward compatible.
- Strict method matching on mutating endpoints; safe verbs (`GET`) can share wider matching for cache efficiency.

## Load balancing & resilience
- Round-robin load balancing with passive health checks; active probes for critical services.
- **Circuit breaking**: trigger on consecutive HTTP failures and latency spikes; retry with jitter and optionally fail open for idempotent GETs while shedding load for writes.
- Per-upstream timeouts protect from slow backends; use `surge` pod autoscaling limits aligned with gateway retries to avoid thundering herds.

## Authentication & middleware
- JWT/OIDC auth on external routes; internal mesh traffic can rely on mTLS/NetworkPolicy.
- Global CORS defaults with per-route overrides for privileged origins.
- Standard middleware chain: `request-id` → `auth` → `rate-limit` → `acl` → `transform` → `observability`.

## API composition patterns
- **Backend-for-Frontend (BFF)**: use aggregator service (`bff-service`) behind the gateway to stitch data for UI flows while keeping per-domain microservices pure.
- **Gateway aggregation**: lightweight request/response transforms and service chaining (e.g., fetch product, then enrich with inventory) stay in the gateway when latency <50ms; heavier joins belong in a dedicated BFF or GraphQL layer.
- **Fallbacks**: degrade to cached/partial responses from a `degraded` upstream on circuit open to preserve UX.

## Observability
- Propagate `traceparent` or `x-request-id` headers; inject correlation IDs when missing.
- Emit structured access logs and Prometheus metrics; enable Jaeger/OTLP tracing exporters in both Kong and Traefik Helm values.

## Files in this package
- `kong/values.yaml`: Helm values enabling DB-less Kong with TLS, metrics, and sidecar-friendly probes.
- `kong/kong.yaml`: declarative config for services, routes, upstreams, plugins, and health/circuit policies.
- `traefik/values.yaml`: Helm values for Traefik entrypoints, providers, metrics, and access logs.
- `traefik/dynamic/ingressroutes.yaml`: CRDs defining IngressRoutes, middlewares, services, and circuit breakers.

## Usage
1. **Kong (helm)**
   - `helm upgrade --install kong kong/kong -f ops/gateway/kong/values.yaml --namespace gateway --create-namespace`.
   - `kubectl apply -f ops/gateway/kong/kong.yaml` to push the DB-less declarative config (ConfigMap/secret if preferred).
2. **Traefik (helm)**
   - `helm upgrade --install traefik traefik/traefik -f ops/gateway/traefik/values.yaml --namespace gateway --create-namespace`.
   - `kubectl apply -f ops/gateway/traefik/dynamic/ingressroutes.yaml` for routes, middlewares, and services.

## Hardening checklist
- Enforce TLS 1.2+ at the edge; redirect HTTP → HTTPS.
- Set strict `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy` via middleware.
- Enable WAF/RateLimit defaults and tune per-route.
- Keep JWT issuer/audience/keys rotated and short-lived; prefer mTLS for service-to-service.
- Wire gateway metrics/health endpoints into Prometheus + Alertmanager SLOs and autoscaler policies.
