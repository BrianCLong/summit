# Governance Drift Scenarios

This playbook documents common policy drift scenarios and how to detect and resolve them.

## Overview

Policy drift occurs when the actual state of infrastructure, dependencies, or containers diverges from the declared governance policies. The OPA-based governance pipeline (`ci-governance.yml`) detects these drifts automatically.

---

## Scenario 1: Container Running as Root

### Detection

```
deny: container runs as root
```

### Root Cause

- Dockerfile missing `USER` directive
- Base image defaults to root
- Explicit `USER root` in Dockerfile

### Resolution

1. Add non-root user to Dockerfile:

   ```dockerfile
   RUN addgroup -S appgroup && adduser -S appuser -G appgroup
   USER appuser
   ```

2. Ensure base image supports non-root:

   ```dockerfile
   FROM node:20-alpine
   # ...
   USER node
   ```

3. Update container policy exception if root is genuinely required (rare):
   ```rego
   # governance/policies/container.rego
   exception[msg] {
     input.image.name == "special-init-container"
     msg := "init container requires root"
   }
   ```

---

## Scenario 2: Critical CVE in Container Image

### Detection

```
deny: critical CVE: CVE-2024-XXXX
```

### Root Cause

- Base image contains vulnerable package
- Application dependency has known vulnerability
- Image not rebuilt after vulnerability disclosure

### Resolution

1. Update base image:

   ```bash
   docker pull node:20-alpine
   docker build --no-cache -t myimage .
   ```

2. Update vulnerable dependency:

   ```bash
   pnpm update <vulnerable-package>
   ```

3. If no fix available, document exception with timeline:
   ```rego
   # governance/policies/container.rego
   exception[msg] {
     input.image.vulnerabilities[_].id == "CVE-2024-XXXX"
     # Exception expires: 2025-02-01
     # Tracking issue: #12345
     msg := "CVE-2024-XXXX: awaiting upstream fix"
   }
   ```

---

## Scenario 3: Unsigned Dependency

### Detection

```
deny: unsigned dep: badlib
```

### Root Cause

- Dependency not published with npm provenance
- Package registry doesn't support signatures
- Internal package without signing configured

### Resolution

1. Prefer signed alternatives:

   ```bash
   pnpm remove badlib
   pnpm add trusted-alternative
   ```

2. Pin exact version with integrity hash:

   ```json
   {
     "dependencies": {
       "badlib": "1.2.3"
     },
     "pnpm": {
       "overrides": {
         "badlib": "1.2.3"
       }
     }
   }
   ```

3. Add to allowlist with justification:
   ```rego
   # governance/policies/deps.rego
   exception[msg] {
     input.deps[_].name == "badlib"
     # Justification: Internal package, verified manually
     # Review date: 2025-01-15
     msg := "badlib: internal package exception"
   }
   ```

---

## Scenario 4: Unpinned Dependency

### Detection

```
deny: dependency not pinned (no version)
```

### Root Cause

- Using `*` or empty version in package.json
- Lock file not committed
- Dependency added without version

### Resolution

1. Pin to specific version:

   ```bash
   pnpm add package@1.2.3
   ```

2. Commit lock file:
   ```bash
   git add pnpm-lock.yaml
   git commit -m "chore: pin dependency versions"
   ```

---

## Scenario 5: SBOM Signature Verification Failed

### Detection

```
SBOM signature verification failed
```

### Root Cause

- SBOM not signed
- Signature doesn't match public key
- Public key rotated without updating allowed-signers.pub

### Resolution

1. Sign the SBOM:

   ```bash
   cosign sign-blob --key cosign.key governance/sbom/demo-bom.spdx.json \
     > governance/sbom/demo-bom.spdx.json.sig
   ```

2. Update public key if rotated:

   ```bash
   cp cosign.pub governance/sbom/allowed-signers.pub
   ```

3. Regenerate SBOM if changed:
   ```bash
   syft . -o spdx-json > governance/sbom/demo-bom.spdx.json
   cosign sign-blob --key cosign.key governance/sbom/demo-bom.spdx.json \
     > governance/sbom/demo-bom.spdx.json.sig
   ```

---

## Escalation Path

1. **Level 1**: Developer fixes in PR
2. **Level 2**: Security team reviews exception request
3. **Level 3**: Architecture review for systemic issues
4. **Emergency**: Security incident response team

## Related Documents

- [Remediation Checklist](./remediation-checklist.md)
- [Governance Loop](../../docs/GOVERNANCE_LOOP.md)
- [Container Policy](../policies/container.rego)
- [Dependency Policy](../policies/deps.rego)
