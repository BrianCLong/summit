# Audit & Evidence Standards

This directory contains the **Audit Trail** for the Summit Governance Ecosystem.

**Purpose**: To provide irrefutable evidence of Agent actions, Governance decisions, and Compliance checks (SOC2, ISO 27001).

## 1. Evidence Bundles

Evidence is collected automatically by the `soc2-evidence.yml` workflow.

**Required Artifacts**:

- `SBOM` (Software Bill of Materials) - from `sbom.yml`
- `SLSA Attestation` - from `slsa-attestation.yml`
- `Test Coverage Report` - from `pr-quality-gate.yml`
- `Policy Scan Results` (OPA) - from `agentic-policy-check.yml`

## 2. Agent Action Logs

Agents must produce a log of their reasoning and actions.

**Location**: PR Description or `AGENT_LOG.md` in the PR.

### Template

```markdown
## Agent Action Log

**Agent ID**: [Name/Version]
**Task**: [Ticket ID]
**Tier**: [Tier Level]

### Reasoning

[Explanation of why this change was made]

### Plan

1. [Step 1]
2. [Step 2]

### Verification

- [ ] Read file X
- [ ] Ran test Y
```

## 3. Governance Decision Records (GDR)

Major decisions by agents or humans affecting the Constitution or Permission Tiers.

**Location**: `docs/audit/decisions/`

### GDR Template

```markdown
# GDR-001: [Title]

**Date**: [YYYY-MM-DD]
**Author**: [Name/Agent]
**Status**: [Proposed/Accepted/Rejected]

## Context

[Problem description]

## Decision

[The decision made]

## Consequences

[Positive and Negative impacts]
```

## 4. Incident Reports

See [Agent Incident Response](../governance/agent-incident-response.md).

**Location**: `docs/audit/incidents/`
