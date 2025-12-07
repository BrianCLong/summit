# IntelGraph Threat Modeling Framework

> **Version**: 1.0.0
> **Last Updated**: 2025-12-06
> **Owner**: Security Team
> **Status**: Active

## Overview

This document defines the lightweight, continuous threat modeling framework for IntelGraph/Summit. Every significant feature should have an attached threat model that:

- Identifies assets and their sensitivity
- Maps entry points and trust boundaries
- Enumerates threats using STRIDE + AI-specific categories
- Documents mitigations and residual risks
- Enables security review during code changes

## Goals

1. **Shift-left security** - Catch threats during design, not production
2. **Developer-friendly** - Brief models, not 40-page documents
3. **Continuous** - Threat models evolve with code
4. **Actionable** - Clear mitigations tied to implementation
5. **Auditable** - Track coverage and freshness automatically

## Methodology: STRIDE + AI Extensions

We use **STRIDE** as our base framework with additional categories for AI/ML-specific threats.

### STRIDE Categories

| Category | Description | Key Questions |
|----------|-------------|---------------|
| **S**poofing | Impersonating a user, service, or system | Can an attacker pretend to be someone else? |
| **T**ampering | Modifying data or code maliciously | Can data be altered in transit or at rest? |
| **R**epudiation | Denying actions without proof | Can actions be traced and attributed? |
| **I**nformation Disclosure | Exposing data to unauthorized parties | Can sensitive data leak? |
| **D**enial of Service | Making systems unavailable | Can the feature be overwhelmed or crashed? |
| **E**levation of Privilege | Gaining unauthorized access | Can an attacker gain higher permissions? |

### AI/Agent-Specific Categories (Extension)

| Category | Description | Key Questions |
|----------|-------------|---------------|
| **PI** - Prompt Injection | Manipulating LLM behavior via crafted inputs | Can user input alter agent behavior? |
| **MA** - Model Abuse | Using AI capabilities for unintended purposes | Can the model be misused? |
| **DP** - Data Poisoning | Corrupting training or reference data | Can adversaries influence model outputs? |
| **GH** - Goal Hijacking | Diverting agent from intended objectives | Can agent goals be subverted? |
| **OA** - Over-Autonomy | Agents taking unreviewed high-risk actions | Are human checkpoints in place? |

## Required Sections Per Threat Model

Each threat model MUST include:

### 1. Feature Overview
- **Name**: Feature/component name
- **Description**: 1-2 sentence summary
- **Owner**: Team/individual responsible
- **Last Updated**: Date
- **Risk Tier**: Critical / High / Medium / Low

### 2. Assets
What are we protecting?

```markdown
| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| User credentials | Critical | Passwords, tokens, API keys |
| Investigation data | High | Intelligence analysis results |
```

### 3. Entry Points
Where can actors interact with the system?

```markdown
| Entry Point | Protocol | Authentication | Trust Level |
|-------------|----------|----------------|-------------|
| GraphQL API | HTTPS | JWT | Authenticated |
| WebSocket | WSS | JWT | Authenticated |
```

### 4. Trust Boundaries
Where does trust change?

```markdown
| Boundary | From | To | Controls |
|----------|------|-----|----------|
| Client → API | Untrusted | Authenticated | TLS, JWT validation |
```

### 5. Threats
Enumerated threats with STRIDE/AI classification:

```markdown
| ID | Category | Threat | Likelihood | Impact | Risk |
|----|----------|--------|------------|--------|------|
| T1 | S | Session hijacking | Medium | High | High |
```

### 6. Mitigations
Controls addressing each threat:

```markdown
| Threat ID | Mitigation | Status | Implementation |
|-----------|------------|--------|----------------|
| T1 | Short-lived tokens | Implemented | server/src/auth/jwt.ts |
```

### 7. Residual Risk
What remains after mitigations?

```markdown
| Threat ID | Residual Risk | Acceptance | Accepted By |
|-----------|---------------|------------|-------------|
| T1 | Token theft during validity | Low | Security Team |
```

## Risk Scoring

### Likelihood Scale
- **High**: Likely to occur; known attack patterns exist
- **Medium**: Possible under specific conditions
- **Low**: Requires significant effort or unusual circumstances

### Impact Scale
- **Critical**: System-wide compromise, major data breach
- **High**: Significant data exposure or service disruption
- **Medium**: Limited data exposure or degraded service
- **Low**: Minimal impact, easily recoverable

### Risk Matrix

|              | Low Impact | Medium Impact | High Impact | Critical Impact |
|--------------|------------|---------------|-------------|-----------------|
| **High**     | Medium     | High          | Critical    | Critical        |
| **Medium**   | Low        | Medium        | High        | Critical        |
| **Low**      | Low        | Low           | Medium      | High            |

## Risk Tiers for Features

| Tier | Criteria | Review Cadence | Approvers |
|------|----------|----------------|-----------|
| **Critical** | Auth, multi-tenant, AI agents, secrets | 30 days | Security Lead + Architect |
| **High** | Data ingestion, exports, integrations | 60 days | Security Team |
| **Medium** | Core features, analytics | 90 days | Tech Lead |
| **Low** | UI components, internal tools | 180 days | Developer |

## Coverage Requirements

### Mandatory Coverage
These directories/features MUST have threat models:

| Path Pattern | Feature | Risk Tier |
|--------------|---------|-----------|
| `server/src/auth/**` | Authentication | Critical |
| `server/src/maestro/**` | AI Orchestration | Critical |
| `services/copilot/**` | AI Copilot | Critical |
| `server/src/graphql/intelgraph/**` | Graph Queries | High |
| `SECURITY/policy/**` | Authorization Policies | Critical |
| `services/api/**` | Core API | High |
| `server/src/conductor/**` | Conductor/JWT | Critical |
| `packages/plugin-system/**` | Plugin System | High |

### Staleness Thresholds
- **Critical** features: Alert if > 30 days old
- **High** features: Alert if > 60 days old
- **Medium** features: Alert if > 90 days old

## Workflow Integration

### 1. New Feature Development
1. Create threat model from template during design
2. Review with Security Team before implementation
3. Reference threat model in PR description
4. Update threat model if design changes

### 2. Code Changes to Existing Features
1. CI checks if change touches covered paths
2. If threat model exists: verify not stale
3. If threat model missing: advisory comment on PR
4. Update threat model if change affects threat surface

### 3. Periodic Review
1. Security Team reviews threat model index monthly
2. Stale models flagged for owner action
3. Annual comprehensive review of all models

## File Locations

```
docs/security/
├── threat-modeling-framework.md    # This document
├── THREAT_MODEL_INDEX.md           # Index of all threat models
└── threat-models/
    ├── template.md                 # Template for new models
    ├── auth.md                     # Authentication threat model
    ├── intelgraph-queries.md       # Graph query threat model
    ├── maestro-runs.md             # AI orchestration threat model
    └── [feature].md                # Additional feature models
```

## CI Integration

The `scripts/security/check-threat-model-coverage.ts` script:

1. Detects changed files in PR
2. Maps changes to required threat models
3. Checks if threat model exists
4. Verifies threat model freshness
5. Posts advisory comment to PR

**Phase 1 (Current)**: Advisory only - does not block PRs
**Phase 2 (Future)**: Blocking for Critical tier features

## Quick Reference

### Creating a New Threat Model
```bash
cp docs/security/threat-models/template.md \
   docs/security/threat-models/[feature].md
# Edit with feature-specific content
# Add entry to THREAT_MODEL_INDEX.md
```

### Running Coverage Check Locally
```bash
npx ts-node scripts/security/check-threat-model-coverage.ts \
  --changed-files "server/src/auth/jwt.ts"
```

### Updating an Existing Model
1. Edit the threat model file
2. Update `last_updated` in frontmatter
3. Update entry in `THREAT_MODEL_INDEX.md`
4. Commit with message: `sec(threat-model): update [feature] threat model`

## References

- [STRIDE Threat Modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [IntelGraph Security Guidelines](./SECURITY_GUIDELINES.md)
- [Existing Threat Model](../../SECURITY/threat-model.md)

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-06 | Security Team | Initial framework |

---

**Next Review**: 2026-03-06
