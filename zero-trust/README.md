# Zero-Trust Network Architecture

> **IntelGraph Platform Zero-Trust Implementation**
>
> Complete zero-trust security posture with service identities, mTLS, network policies, and policy-as-code.

## Overview

This directory contains the zero-trust network architecture for the IntelGraph platform. Every service call is treated as hostile until proven otherwise through cryptographic identity verification.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZERO-TRUST ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   SPIFFE     │    │   Istio      │    │    OPA       │                   │
│  │   /SPIRE     │───▶│   Service    │───▶│   Policy     │                   │
│  │   Identity   │    │   Mesh       │    │   Engine     │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                    │                   │                           │
│         ▼                    ▼                   ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Service    │    │    mTLS      │    │   Service    │                   │
│  │   Identity   │    │   Everywhere │    │   AuthZ      │                   │
│  │   (SVID)     │    │              │    │   Rules      │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  NETWORK POLICIES            │  POLICY-AS-CODE                              │
│  ─────────────────           │  ─────────────────                           │
│  • Default deny all          │  • Version controlled                        │
│  • Explicit allow rules      │  • Automated testing                         │
│  • Least-privilege egress    │  • Dry-run validation                        │
│  • Namespace isolation       │  • Audit logging                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
zero-trust/
├── README.md                    # This file
├── config/
│   ├── trust-domain.yaml        # SPIFFE trust domain configuration
│   ├── service-registry.yaml    # Service identity registry
│   └── communication-matrix.yaml # Service-to-service permissions
├── identity/
│   ├── spire/                   # SPIRE server/agent configurations
│   │   ├── server.yaml
│   │   ├── agent.yaml
│   │   └── entries/             # SPIFFE entry registrations
│   └── certificates/            # Certificate management
├── policies/
│   ├── network/                 # Kubernetes NetworkPolicies
│   │   ├── base/               # Base policies (default-deny)
│   │   ├── services/           # Per-service policies
│   │   └── namespaces/         # Namespace-level policies
│   ├── opa/                     # OPA/Rego policies
│   │   ├── service-authz.rego  # Service-to-service authorization
│   │   └── tests/              # Policy tests
│   └── istio/                   # Istio security policies
│       ├── peer-authentication.yaml
│       ├── authorization-policy.yaml
│       └── destination-rules.yaml
├── tests/
│   ├── unit/                    # Policy unit tests
│   ├── integration/             # Connectivity tests
│   └── chaos/                   # Security chaos tests
└── tools/
    ├── policy-lint.sh           # Policy linting
    ├── policy-diff.sh           # Policy change analysis
    └── validate-matrix.ts       # Communication matrix validation
```

## Quick Start

### 1. Deploy SPIRE Infrastructure

```bash
# Deploy SPIRE server
kubectl apply -f identity/spire/server.yaml

# Deploy SPIRE agent (DaemonSet)
kubectl apply -f identity/spire/agent.yaml

# Register service entries
kubectl apply -f identity/spire/entries/
```

### 2. Apply Network Policies

```bash
# Apply base policies (default-deny)
kubectl apply -f policies/network/base/

# Apply service-specific policies
kubectl apply -f policies/network/services/

# Apply namespace policies
kubectl apply -f policies/network/namespaces/
```

### 3. Deploy mTLS Configuration

```bash
# Apply Istio PeerAuthentication
kubectl apply -f policies/istio/peer-authentication.yaml

# Apply Istio AuthorizationPolicies
kubectl apply -f policies/istio/authorization-policy.yaml

# Apply DestinationRules
kubectl apply -f policies/istio/destination-rules.yaml
```

### 4. Load OPA Policies

```bash
# Load service authorization policies
kubectl create configmap opa-service-authz \
  --from-file=policies/opa/service-authz.rego \
  -n policy
```

## Key Concepts

### Service Identity (SPIFFE/SPIRE)

Every service has a cryptographic identity in the form of a SPIFFE ID:
```
spiffe://intelgraph.local/ns/<namespace>/sa/<service-account>
```

### Communication Matrix

The communication matrix (`config/communication-matrix.yaml`) defines:
- Which services can communicate
- Allowed methods/paths
- Rate limits and circuit breakers

### Default-Deny Posture

All network traffic is denied by default. Services must explicitly be granted access through:
1. NetworkPolicies (L3/L4)
2. Istio AuthorizationPolicies (L7)
3. OPA service authorization (application-level)

## Testing

### Run Policy Tests

```bash
# Run all tests
pnpm test:zero-trust

# Run specific test suites
pnpm test:zero-trust:network    # Network policy tests
pnpm test:zero-trust:opa        # OPA policy tests
pnpm test:zero-trust:chaos      # Chaos/security tests
```

### Validate Policies Before Deploy

```bash
# Lint all policies
./tools/policy-lint.sh

# Generate diff report
./tools/policy-diff.sh

# Validate communication matrix
pnpm run validate:matrix
```

## Monitoring

### Key Metrics

- `zero_trust_policy_evaluations_total` - Policy evaluation count
- `zero_trust_policy_denials_total` - Policy denial count
- `mtls_handshake_duration_seconds` - mTLS handshake latency
- `spiffe_svid_expiry_seconds` - SVID expiration time

### Alerts

See `observability/alerts/zero-trust.yaml` for configured alerts:
- `ZeroTrustPolicyDenialRateHigh`
- `MTLSHandshakeFailureRateHigh`
- `SPIFFESVIDExpiryImminent`
- `NetworkPolicyViolation`

## Compliance

This zero-trust implementation supports:
- **FedRAMP**: Continuous authorization
- **NIST 800-207**: Zero Trust Architecture
- **CISA Zero Trust Maturity Model**: Identity-centric security

## Troubleshooting

### Common Issues

1. **Service cannot communicate**
   - Check NetworkPolicy allows the connection
   - Verify SPIFFE entry is registered
   - Check Istio AuthorizationPolicy

2. **mTLS handshake failures**
   - Verify SVID is valid and not expired
   - Check trust bundle is synchronized
   - Ensure PeerAuthentication is STRICT

3. **Policy evaluation errors**
   - Check OPA policy syntax
   - Verify input schema matches
   - Check policy is loaded in ConfigMap

## References

- [SPIFFE Specification](https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/)
- [Istio Security](https://istio.io/latest/docs/concepts/security/)
- [OPA Policy Language](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
