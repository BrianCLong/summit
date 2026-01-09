# Release Documentation

This directory contains all release-related documentation for the Summit platform.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [GA Release Process](./ga-release-process.md) | Standard GA release workflow |
| [Hotfix Lane](./HOTFIX_LANE.md) | Emergency hotfix releases |
| [Hotfix Runbook](./HOTFIX_RUNBOOK.md) | Step-by-step hotfix guide |
| [SemVer Policy](./SEMVER_POLICY.md) | Version numbering policy |
| [Release Train](./RELEASE_TRAIN.md) | Release cadence and trains |

---

## Release Pathways

### Standard Release Path

```
Feature Branch → Main → RC Tag → GA Promotion → Production
```

1. **Feature Development**: Code merged to main via PR
2. **Release Candidate**: RC tag created from stable main
3. **GA Promotion**: RC promoted to GA after validation
4. **Production**: GA release deployed to production

**Documents:**
- [GA Release Process](./ga-release-process.md)
- [Release Train](./RELEASE_TRAIN.md)
- [GA Checklist](./GA_CHECKLIST.md)

### Hotfix Path (Emergency)

```
Parent GA → Hotfix Branch → Hotfix Tag → Production
```

For critical fixes when the standard path is too slow:
- Security vulnerabilities
- Production outages
- P0/P1 incidents

**Documents:**
- [Hotfix Lane Policy](./HOTFIX_LANE.md)
- [Hotfix Runbook](./HOTFIX_RUNBOOK.md)
- [Post-Mortem Template](../releases/HOTFIX_POSTMORTEMS/_template.md)

---

## Versioning

| Version Type | Format | Example | Use Case |
|--------------|--------|---------|----------|
| GA Release | `vX.Y.Z` | `v4.1.2` | Standard releases |
| Release Candidate | `vX.Y.Z-rc.N` | `v4.1.2-rc.1` | Pre-release validation |
| Hotfix | `vX.Y.Z+1` | `v4.1.3` | Emergency patches |
| Hotfix Suffix | `vX.Y.Z-hotfix.N` | `v4.1.2-hotfix.1` | Minor hotfixes |

**Documents:**
- [SemVer Policy](./SEMVER_POLICY.md)
- [Versioning](./versioning.md)

---

## Governance & Evidence

### Evidence Bundles

Every release includes an evidence bundle containing:
- Provenance manifest
- SBOM (CycloneDX format)
- Test results
- Security scan results
- Compliance attestations

**Documents:**
- [Evidence Bundles](./evidence-bundles.md)
- [GA Evidence](./GA_EVIDENCE.md)
- [GA Evidence Index](./GA_EVIDENCE_INDEX.md)

### Release Gates

| Gate | Required For | Enforcement |
|------|--------------|-------------|
| Unit Tests | All releases | CI blocking |
| Integration Tests | All releases | CI blocking |
| Security Scan | All releases | CI blocking |
| GA Gate | GA releases | Environment approval |
| Hotfix Gate | Hotfixes | Environment approval (2 reviewers) |

**Documents:**
- [GA Gate](./ga-gate.md)
- [GA Readiness Report](./GA_READINESS_REPORT.md)

---

## State & Audit

Release state is tracked in `docs/releases/_state/`:

| File | Purpose |
|------|---------|
| `hotfix_waivers.json` | Active emergency waivers |
| `waiver_audit_log.json` | Immutable waiver history |
| `freeze_mode.json` | Change freeze status |
| `release_override.json` | Override approvals |

---

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `release-ga.yml` | Tag push `v*` | Standard GA release |
| `hotfix-release.yml` | Manual dispatch | Emergency hotfix |
| `release-promote-ga.yml` | Manual dispatch | RC → GA promotion |
| `release-post-verify.yml` | Release publish | Post-release verification |

---

## Decision Records

- [GA Decisions](./GA_DECISIONS.md) - Key decisions made during GA preparation
- [GA Retrospective](./GA_RETROSPECTIVE.md) - Post-GA learnings
- [Blockers](./BLOCKERS.md) - Known blockers and mitigations

---

## Related Documentation

- [CI Documentation](../ci/) - CI/CD pipeline documentation
- [Governance](../governance/) - Governance policies
- [Compliance](../compliance/) - Compliance requirements
- [Security](../security/) - Security policies

---

## Contact

| Role | Team |
|------|------|
| Release Captain | @release-captains |
| Security | @security-team |
| SRE On-Call | @sre-oncall |
