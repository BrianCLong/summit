# Security & Compliance Checklist

> Acceptance criteria for Prompts 26-30

## Prompt 26: Security Baseline and Runtime Hardening

- [ ] All baseline security checks pass in CI
- [ ] Hardening applied to staging environment
- [ ] No critical vulnerabilities open
- [ ] Security documentation updated
- [ ] Runbooks for security incidents created
- [ ] Container security best practices followed
- [ ] Emergency bypass procedures documented

## Prompt 27: Threat Modeling Deep Dive

- [ ] All critical assets identified
- [ ] Attack surface mapped for all entry points
- [ ] STRIDE analysis complete for key flows
- [ ] At least one critical risk mitigated with implemented control
- [ ] Mitigations catalog maintained
- [ ] Threat model reviewed by security team
- [ ] Asset criticality ranking documented

## Prompt 28: Secrets Management Roadmap

- [ ] Vault/secrets manager deployed and accessible
- [ ] All services migrated to centralized secrets
- [ ] Rotation policies in place for each secret type
- [ ] Access audited and logged
- [ ] Emergency procedures documented
- [ ] CI/CD secrets integration working
- [ ] Backup and recovery tested

## Prompt 29: SBOM Augmentation and Dependency Signing

- [ ] SBOM generated for all artifacts
- [ ] Signatures verifiable offline
- [ ] Provenance meets SLSA Level 2
- [ ] CI pipeline integrated
- [ ] Documentation complete
- [ ] Vulnerability status included in SBOM
- [ ] Signing keys properly managed

## Prompt 30: License Compliance Governance

- [ ] License policy approved by legal
- [ ] CI gates blocking prohibited licenses
- [ ] All current violations resolved or exempted
- [ ] Exception process documented and functional
- [ ] Quarterly audit scheduled
- [ ] Remediation guide available
- [ ] Audit trail for all decisions

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | | | |
| Compliance Officer | | | |
| Legal Representative | | | |
