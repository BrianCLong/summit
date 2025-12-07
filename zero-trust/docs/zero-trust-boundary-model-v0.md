# Zero Trust & Boundary Model v0

This document defines the initial zero-trust networking model for CompanyOS. It codifies zones, identity expectations, enforcement controls, and operational guardrails so every hop is authenticated, authorized, and observable.

## Trust Zones and Boundaries

| Zone | Purpose | Examples | Default Posture |
| ---- | ------- | -------- | --------------- |
| Public Edge | Entry points that face the internet or partner networks. | API gateways, CDN, WAF/ingress controllers, auth portals. | Deny by default; allow only through ingress controllers with WAF + rate limits; all inbound requires TLS termination and identity-aware routing (OIDC/JWT). |
| App Plane | Stateless and stateful application services. | Service mesh workloads, background workers, GraphQL/REST services. | Mutual TLS required; traffic permitted only per service-communication matrix; namespace isolation for tenants. |
| Data Plane | Persistence and messaging systems. | Databases, object storage, message buses. | No direct public access; only app-plane identities with approved roles; tight network segmentation per data sensitivity. |
| Admin Plane | Control and operations paths. | K8s API server, CI/CD runners for infra, observability stack, bastions. | Highly restricted; PAM/MFA enforced; break-glass identities time-bound; audit logged. |
| CI/CD Plane | Build, test, and deploy pipelines. | Runners, artifact registries, SBOM scanners, signing services. | Network egress pinned to registries and mirrors; artifact signing required before promotion; runners isolate tenant secrets. |

### Allowed Traffic & Identity Requirements

- Public Edge ➜ App Plane: Only via ingress/WAF; client identity via OIDC/JWT; mTLS from ingress to services using mesh identities.
- App Plane ➜ Data Plane: Allowed per service+resource mapping; mesh-issued SPIFFE/SVID required; enforce database authz mapped to workload identity; no shared credentials.
- App Plane ➜ App Plane: Allowed per communication matrix; mTLS with SPIFFE IDs; layer-7 authz via OPA/Istio AuthorizationPolicies.
- Admin Plane ➜ App/Data/CI/CD: Only via bastion or control-plane API; strong MFA + Just-In-Time (JIT) access; session recording and command logging.
- CI/CD Plane ➜ App Plane: Deployments via GitOps agent or mesh gateway with signing verification; runners use short-lived tokens bound to workload identity; no lateral movement.
- Egress (any zone ➜ Internet/3rd party): Forced through egress gateways/proxies with URL/IP allow-lists, TLS interception where permitted, and DLP.
- Third-party connections: Partners treated as untrusted; terminate at partner ingress with dedicated trust domain; federate identities via OIDC/SAML and constrain via policy sandbox.
- On-prem/edge: Connect through IPSec/WireGuard gateways into a dedicated onboarding namespace; require device attestation and posture checks before issuing identities.

## Enforcement Mechanisms

### Service Identity and Authentication
- SPIFFE/SPIRE-issued SVIDs for every workload; identities encode tenant/namespace and workload purpose.
- Mesh-wide mTLS enforced via PeerAuthentication; DestinationRules lock TLS mode to ISTIO_MUTUAL.
- Identity binding to workload metadata (namespace, service account, image digest) to prevent token reuse.
- Database and queue auth maps mesh identity to roles (no shared passwords); cert/key material rotated automatically.

### Network Policies and Microsegmentation
- Namespace-level default-deny NetworkPolicies; only explicitly allowed ports/peers opened.
- Service-to-service allow rules generated from the communication matrix in `config/communication-matrix.yaml`.
- Istio AuthorizationPolicies for L7 allow/deny on methods, paths, and tenant context; OPA sidecars for fine-grained business rules.
- Ownership: platform security owns base/default policies; service teams own service-specific allow rules; changes go through shared policy repo with mandatory review.

### Egress Controls, Proxies, and SSRF Protection
- Single egress gateway per tenant/namespace; outbound traffic requires explicit policy allow-list and is logged.
- HTTP/SOCKS proxies with authn tied to workload identity; no direct node-level egress.
- Metadata service protection: block link-local metadata IPs except via signed IMDSv2 proxy with least privilege.
- Outbound DNS restricted to platform resolvers with response-policy zones; deny private IP resolution from public zones.
- SSRF mitigations: outbound allow-lists in service configs, proxy-enforced domain/port filters, and ALPN/SNI validation.

## Visibility and Change Control

- Flow visibility: VPC flow logs, mesh telemetry (mTLS handshakes, policy decisions), and DNS query logs shipped to SIEM with 13-month retention.
- Visualization: central network graph derived from communication matrix + live telemetry; highlight denied flows and new/unknown edges.
- Audit: All policy artifacts version-controlled; policy evaluations logged with identity, policy ID, and decision.
- Change process: pull-request workflow with automated policy lint, dry-run, and canary evaluation; progressive rollout via staged namespaces.
- Temporary exceptions: time-bound, auto-expiring allow rules with owner and ticket reference; alert before expiry/overrun.
- Shadow network detection: compare live flow logs to declared matrix weekly; alert on undeclared edges and anomalous egress.

## Reference Patterns for New Services

1. **Identity onboarding**: Register service account + namespace in SPIRE; ensure image is signed and attested before issuing SVID.
2. **Network policy**: Add default-deny + egress deny policies; create service-specific NetworkPolicy allowing only ingress from required peers and ports.
3. **Communication matrix entry**: Declare allowed upstreams/downstreams (methods, paths, ports, tenant scope) in `config/communication-matrix.yaml`; run `tools/validate-matrix.ts`.
4. **Mesh config**: Apply PeerAuthentication (STRICT) and DestinationRule for ISTIO_MUTUAL; add AuthorizationPolicy scoping allowed JWT claims/tenant headers.
5. **Data access**: Map SPIFFE ID to database/queue roles; store credentials in secrets manager; enable TLS to data stores.
6. **Egress**: If needed, request egress via gateway with domain/IP allow-list; attach DLP and signing requirements for outbound artifacts.
7. **Observability**: Emit mesh telemetry, HTTP/gRPC audit logs with identity and tenant; enable log-based alerts for denied calls.

## Zero-Trust Compliance Checklist

A service or network change is zero-trust-compliant if all are true:

- [ ] Workload uses SPIFFE/SVID identity; certificates are short-lived and auto-rotated.
- [ ] mTLS enforced on all intra-cluster and east-west traffic; TLS 1.2+ on north-south.
- [ ] Default-deny NetworkPolicies applied at namespace and service level; only required ports opened.
- [ ] Communication matrix entry exists and matches observed flows (no undeclared edges).
- [ ] AuthorizationPolicies/OPA rules enforce tenant isolation and least privilege.
- [ ] Data stores authenticate via workload identity and role-based access; no shared/static credentials.
- [ ] Egress passes through approved gateway/proxy with allow-list + logging; metadata endpoints blocked by default.
- [ ] Secrets managed via vault/KMS; no secrets in images or configs.
- [ ] Telemetry (flow, DNS, authz decisions) is enabled and integrated with SIEM/alerts.
- [ ] Changes reviewed via PR with lint/dry-run tests; temporary exceptions are time-boxed and tracked.

## Zero Trust & Boundary Model v0 Outline

- **Scope**: Applies to all CompanyOS environments (dev, staging, prod, on-prem/edge) with tenant-aware controls.
- **Principles**: Default deny, explicit identity, least privilege, continuous verification, and observability-first.
- **Zones**: Public Edge, App Plane, Data Plane, Admin Plane, CI/CD Plane with dedicated ingress/egress boundaries.
- **Trust Fabric**: SPIFFE identities + mesh mTLS; policy-as-code for network/L7 authorization; GitOps-managed rollouts.
- **Boundary Controls**: NetworkPolicies, AuthorizationPolicies, egress gateways/proxies, metadata protection, DNS RPZ, and DLP.
- **Operations**: Versioned policy repo, automated validation, staged rollouts, and exception governance with expirations.
- **Assurance**: Continuous comparison of declared vs. observed flows; audit trails for every policy decision and change.

