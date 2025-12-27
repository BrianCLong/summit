# Governance Remediation Checklist

Use this checklist when addressing governance policy violations detected by CI.

## Pre-Remediation

- [ ] Identify the specific policy violation from CI logs
- [ ] Locate the relevant policy file in `governance/policies/`
- [ ] Understand the intent behind the policy
- [ ] Determine if this is a true violation or false positive

## Container Policy Violations

### Root User Violation

- [ ] Check Dockerfile for `USER` directive
- [ ] Verify base image default user
- [ ] Add non-root user if missing:
  ```dockerfile
  RUN addgroup -S app && adduser -S app -G app
  USER app
  ```
- [ ] Test container runs successfully as non-root
- [ ] Update any volume mounts for correct permissions

### Critical CVE Violation

- [ ] Identify CVE details (severity, affected component)
- [ ] Check if upstream fix is available
- [ ] Update base image or dependency
- [ ] Rebuild container with `--no-cache`
- [ ] Re-scan with Trivy to confirm fix
- [ ] If no fix: document exception with expiry date

## Dependency Policy Violations

### Unsigned Dependency

- [ ] Check if alternative signed package exists
- [ ] Verify package integrity manually
- [ ] Pin exact version with lockfile
- [ ] If exception needed:
  - [ ] Document justification
  - [ ] Set review date
  - [ ] Add to policy exception list

### Unpinned Dependency

- [ ] Add specific version to package.json
- [ ] Run `pnpm install` to update lockfile
- [ ] Commit both package.json and pnpm-lock.yaml
- [ ] Verify CI passes

## SBOM Violations

### Missing Signature

- [ ] Generate SBOM if missing:
  ```bash
  syft . -o spdx-json > governance/sbom/demo-bom.spdx.json
  ```
- [ ] Sign SBOM:
  ```bash
  cosign sign-blob --key cosign.key governance/sbom/demo-bom.spdx.json \
    > governance/sbom/demo-bom.spdx.json.sig
  ```
- [ ] Commit signature file

### Invalid Signature

- [ ] Verify correct public key in `allowed-signers.pub`
- [ ] Re-sign if SBOM was regenerated
- [ ] Check for key rotation

## Exception Process

If a policy exception is genuinely required:

1. [ ] Create exception in relevant `.rego` file
2. [ ] Include clear justification comment
3. [ ] Set expiry/review date
4. [ ] Link to tracking issue
5. [ ] Get security team approval
6. [ ] Document in this PR description

Example exception:

```rego
exception[msg] {
  input.deps[_].name == "legacy-lib"
  # Justification: Required for legacy integration
  # Expires: 2025-03-01
  # Tracking: #12345
  msg := "legacy-lib: approved exception"
}
```

## Post-Remediation

- [ ] Run governance CI locally:
  ```bash
  opa test governance/policies governance/tests -v
  ```
- [ ] Push changes and verify CI passes
- [ ] Update any related documentation
- [ ] Notify security team if exception added

## Escalation

If unable to remediate:

1. [ ] Document blocker in issue
2. [ ] Tag `@security-team` for review
3. [ ] Consider rollback if critical path blocked
4. [ ] Schedule architecture review if systemic

## Related Documents

- [Drift Scenarios](./drift-scenarios.md)
- [Governance Loop](../../docs/GOVERNANCE_LOOP.md)
- [Container Policy](../policies/container.rego)
- [Dependency Policy](../policies/deps.rego)
