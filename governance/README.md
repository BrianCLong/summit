# Governance

Centralized governance artifacts for the Summit agent ecosystem. Documents in
this directory codify policies, approvals, and safety controls that all agents
must honor alongside `SUMMIT_PRIME_BRAIN.md`.

## Policy-as-Code

This directory implements OPA (Open Policy Agent) based policy-as-code for:

- **Container Security**: Enforce non-root users, block critical CVEs
- **Dependency Hygiene**: Require version pinning, prefer signed packages
- **SBOM Verification**: Cosign-based signature verification

### Directory Structure

```
governance/
├── policies/           # OPA Rego policy definitions
│   ├── container.rego  # Container security policies
│   └── deps.rego       # Dependency policies
├── tests/              # OPA policy unit tests
│   ├── container_test.rego
│   └── deps_test.rego
├── playbooks/          # Remediation playbooks
│   ├── drift-scenarios.md
│   └── remediation-checklist.md
└── sbom/               # Software Bill of Materials
    ├── demo-bom.spdx.json    # SPDX SBOM
    └── allowed-signers.pub   # Trusted public keys
```

### Quick Start

```bash
# Run policy tests
opa test governance/policies governance/tests -v

# Evaluate container policy
opa eval -d governance/policies \
  -i sample-container.json \
  "data.container.policy.deny"

# Evaluate dependency policy
opa eval -d governance/policies \
  -i sample-deps.json \
  "data.deps.policy.deny"
```

### CI Integration

Governance checks run automatically via `.github/workflows/ci-governance.yml`:

1. **OPA Tests**: Validates policy logic
2. **SBOM Gate**: Verifies SBOM signatures (optional, enable with `REQUIRE_SBOM_SIGNATURE=1`)

### Documentation

- [Governance Loop](../docs/GOVERNANCE_LOOP.md) - Full governance process documentation
- [Drift Scenarios](./playbooks/drift-scenarios.md) - Common policy drift scenarios
- [Remediation Checklist](./playbooks/remediation-checklist.md) - Step-by-step remediation guide
