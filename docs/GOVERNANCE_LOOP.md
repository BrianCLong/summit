# Governance Loop

This document describes the continuous governance loop that ensures policy compliance across the Summit platform.

## Overview

The governance loop is a CI-integrated policy-as-code system that:

1. **Defines** policies as OPA Rego rules
2. **Tests** policies with unit tests
3. **Enforces** policies in CI pipelines
4. **Remediates** violations with playbooks
5. **Iterates** based on findings

```
┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LOOP                          │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Define  │───▶│   Test   │───▶│ Enforce  │              │
│  │ Policies │    │ Policies │    │   in CI  │              │
│  └──────────┘    └──────────┘    └────┬─────┘              │
│       ▲                               │                     │
│       │                               ▼                     │
│  ┌────┴─────┐                   ┌──────────┐               │
│  │  Iterate │◀──────────────────│Remediate │               │
│  │ & Improve│                   │Violations│               │
│  └──────────┘                   └──────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Policy Definitions

Located in `governance/policies/`:

- **`container.rego`**: Container security policies
  - Deny root user
  - Deny critical CVEs

- **`deps.rego`**: Dependency policies
  - Require version pinning
  - Require signed packages

### 2. Policy Tests

Located in `governance/tests/`:

- **`container_test.rego`**: Container policy unit tests
- **`deps_test.rego`**: Dependency policy unit tests

Run tests:

```bash
opa test governance/policies governance/tests -v
```

### 3. CI Enforcement

Workflow: `.github/workflows/ci-governance.yml`

Jobs:

- **opa**: Runs policy tests and evaluates policies
- **sbom**: Verifies SBOM signatures with cosign

### 4. SBOM Verification

Located in `governance/sbom/`:

- **`demo-bom.spdx.json`**: SPDX SBOM document
- **`allowed-signers.pub`**: Trusted public keys for verification

Script: `.ci/cosign-policy.sh`

## Policy Language

Policies are written in [Rego](https://www.openpolicyagent.org/docs/latest/policy-language/), OPA's declarative policy language.

### Deny Rules

```rego
package container.policy

# Deny if container runs as root
deny[msg] {
  input.image.user == "root"
  msg := "container runs as root"
}
```

### Exception Rules

```rego
# Allow specific exceptions with documentation
exception[msg] {
  input.image.name == "init-container"
  # Justification: Init container requires root for setup
  # Expires: 2025-06-01
  msg := "init-container: approved root exception"
}
```

## Input Formats

### Container Input

```json
{
  "image": {
    "name": "myapp",
    "tag": "1.0.0",
    "user": "appuser",
    "vulnerabilities": [
      { "id": "CVE-2024-1234", "severity": "HIGH" },
      { "id": "CVE-2024-5678", "severity": "LOW" }
    ]
  }
}
```

### Dependency Input

```json
{
  "deps": [
    { "name": "express", "version": "4.18.2", "signed": true },
    { "name": "lodash", "version": "4.17.21", "signed": true }
  ]
}
```

## Integration Points

### CI Pipeline

```yaml
# In your workflow
jobs:
  governance:
    uses: ./.github/workflows/ci-governance.yml
```

### Pre-commit

```bash
# Add to .husky/pre-commit
opa test governance/policies governance/tests
```

### Local Development

```bash
# Test policies
opa test governance/policies governance/tests -v

# Evaluate against sample input
opa eval -d governance/policies \
  -i sample-input.json \
  "data.container.policy.deny"
```

## Remediation

When violations are detected:

1. Review the specific violation in CI logs
2. Consult the relevant playbook:
   - [Drift Scenarios](../governance/playbooks/drift-scenarios.md)
   - [Remediation Checklist](../governance/playbooks/remediation-checklist.md)
3. Fix the issue or request an exception
4. Push and verify CI passes

## Adding New Policies

1. Create policy file in `governance/policies/`:

   ```rego
   package myarea.policy

   deny[msg] {
     # policy logic
     msg := "violation message"
   }
   ```

2. Add tests in `governance/tests/`:

   ```rego
   package myarea.policy

   test_my_violation {
     deny contains "violation message"
     with input as {...}
   }
   ```

3. Run tests locally:

   ```bash
   opa test governance/policies governance/tests -v
   ```

4. Commit and push

## SBOM Signing

For production deployments, enable SBOM signature verification:

1. Generate keypair (keep private key secure):

   ```bash
   cosign generate-key-pair
   ```

2. Update public key:

   ```bash
   cp cosign.pub governance/sbom/allowed-signers.pub
   ```

3. Sign SBOM:

   ```bash
   cosign sign-blob --key cosign.key \
     governance/sbom/demo-bom.spdx.json \
     > governance/sbom/demo-bom.spdx.json.sig
   ```

4. Enable enforcement:
   ```bash
   export REQUIRE_SBOM_SIGNATURE=1
   ```

## Related Documents

- [Governance README](../governance/README.md)
- [Drift Scenarios](../governance/playbooks/drift-scenarios.md)
- [Remediation Checklist](../governance/playbooks/remediation-checklist.md)
- [SLSA Compliance](./security/SLSA-L3-COMPLIANCE.md)
