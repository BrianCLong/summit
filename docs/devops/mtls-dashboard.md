Mutual TLS (mTLS) Dashboard and Cluster Validation

Overview

- Enforces STRICT mTLS via Istio `PeerAuthentication` and limits cross-namespace traffic with `AuthorizationPolicy`.
- Provides a Grafana dashboard outline to track mTLS handshake errors and policy denials.

Provisioning

- Ensure labels/annotations:
  - Namespace: `intelgraph`
  - Pods: `sidecar.istio.io/inject: "true"`
- Apply meshes:
  - `deploy/k8s/istio/peer-authentication.yaml`
  - `deploy/k8s/istio/authorization-policy.yaml`

Validate Labels

- `kubectl get ns intelgraph -o yaml | grep -i label -A2`
- `kubectl -n intelgraph get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.sidecar\.istio\.io/inject}{"\n"}{end}'`

Grafana Dashboard (signals)

- mTLS handshake failures: `istio_requests_total{reporter="destination", response_code!~"2..", connection_security_policy!="mutual_tls"}`
- Policy denials: `istio_requests_total{response_code="403"}`
- Client/server TLS mode: `istio_requests_total` grouped by `connection_security_policy`

Import

- Add Prometheus datasource.
- Create dashboard with the above PromQL panels; save under `Security/mTLS`.
