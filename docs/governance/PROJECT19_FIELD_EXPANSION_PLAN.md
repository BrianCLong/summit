# Project 19 Field Expansion Implementation Plan

## Overview

This document outlines the expansion of Project 19 (Summit Development Roadmap) to include comprehensive governance, automation, and executive visibility fields. The expansion transforms the project from a simple roadmap into an automated governance system.

## Implementation Goals

### Primary Objectives

1. **Executable Governance**: Convert roadmap policy from advisory to enforceable
2. **Evidence Integration**: Link CI/CD artifacts as evidence for project status
3. **Executive Visibility**: Provide deterministic, auditable executive metrics
4. **Automation Safety**: Enable safe, bounded automation with guardrails
5. **Audit Compliance**: Ensure ready access to audit-relevant information

### Success Criteria

- All governance fields populated automatically from source signals
- No manual maintenance of computed fields
- Executive metrics derived deterministically from CI data
- Automation bounded by safety constraints
- Complete audit trail for all changes

## Field Categories & Specifications

### 1. Execution & Flow Control Fields

- **Delivery Class**: `single_select` (`Feature | Infra | Security | Compliance | Release | Tech Debt | Research`)
- **Work Type**: `single_select` (`Human | Agent | Hybrid`)
- **Automation Eligibility**: `single_select` (`Manual Only | Agent Assist | Agent Execute | Fully Autonomous`)
- **WIP Risk**: `single_select` (`Low | Medium | High`)
- **Execution Confidence**: `number` (`0-100`)

### 2. Planning & Coordination Fields

- **Planned Start**: `date`
- **Planned Finish**: `date`
- **Actual Start**: `date`
- **Actual Finish**: `date`
- **Blocked Reason**: `single_select` (`None | Dependency | Decision | CI | Security | Compliance | Infra | Scope | Unknown`)
- **Blocked Detail**: `text`
- **Upstream Dependency Count**: `number`
- **Downstream Impact Count**: `number`

### 3. Governance & Gate Fields

- **Governance Gate**: `single_select` (`None | Design | Security | Compliance | Release | GA`)
- **Gate Status**: `single_select` (`Not Started | In Review | Blocked | Approved`)
- **Policy Version**: `text`
- **Evidence Required**: `single_select` (`No | Yes`)
- **Evidence Complete**: `single_select` (`No | Yes`)
- **Evidence Bundle ID**: `text`
- **Audit Criticality**: `single_select` (`Informational | Control | Material`)
- **External Audit Scope**: `single_select` (`No | Yes`)
- **Control Mapping**: `multi_select` (`SOC2 | ISO27001 | NIST800-53 | SLSA | SBOM`)

### 4. CI/CD Signal Fields

- **CI Status Snapshot**: `single_select` (`Green | Flaky | Failing | Unknown`)
- **Determinism Risk**: `single_select` (`None | Potential | Confirmed`)
- **Test Coverage Delta**: `number`
- **Artifact Produced**: `single_select` (`No | Yes`)
- **Release Train**: `single_select` (`Nightly | Weekly | MVP-4 | GA | Post-GA`)
- **Release Blocker**: `single_select` (`No | Yes`)
- **Rollback Required**: `single_select` (`No | Yes`)
- **Kill-Switch Available**: `single_select` (`No | Yes`)

### 5. Agent & Automation Fields

- **Primary Agent**: `single_select` (`Jules | Codex | Claude | Qwen | Atlas | Antigravity | Human`)
- **Secondary Agents**: `multi_select` (`Jules | Codex | Claude | Qwen | Atlas | Antigravity`)
- **Agent Prompt ID**: `text`
- **Prompt Version**: `text`
- **Agent Output Determinism**: `single_select` (`Deterministic | Bounded | Freeform`)
- **Max Fix Scope**: `number`
- **Human Approval Required**: `single_select` (`No | Yes`)
- **Dry-Run Supported**: `single_select` (`No | Yes`)
- **Auto-Merge Allowed**: `single_select` (`No | Yes`)

### 6. Strategic Alignment Fields

- **Strategic Theme**: `single_select` (`GA Readiness | Trust | Scale | Cost | Velocity | Moat`)
- **Customer Impact**: `single_select` (`None | Internal | Pilot | GA`)
- **Revenue Sensitivity**: `single_select` (`None | Indirect | Direct`)
- **Reputation Risk**: `single_select` (`Low | Medium | High | Existential`)
- **Impact Score**: `number` (`1-10`)
- **Effort Score**: `number` (`1-10`)
- **Risk Score**: `number` (`1-10`)
- **WSJF Score**: `number` (computed)
- **True Priority**: `number` (computed)

### 7. Computed/Synthetic Fields (Automation-Only)

- **WSJF Score**: Weighted Shortest Job First (computed from Impact/Effort/Risk scores)
- **True Priority**: Composite priority score (computed from multiple inputs)
- **GA Readiness Score**: Gate health and evidence completeness (computed)
- **Automation Safety Score**: From Max Fix Scope, approval flags, risk (computed)
- **Agent Confidence Score**: From agent selection and determinism (computed)
- **Expected Cycle Time**: From effort and risk factors (computed)

## Implementation Phases

### Phase 1: Schema Definition & Field Creation (Days 1-3)

- Define complete field schema with all types and options
- Create field provisioning script to match schema
- Provision all new fields to Project 19
- Validate field creation and option sets

### Phase 2: Mapping & Event Integration (Days 3-7)

- Create label/milestone → field mapping rules
- Implement event processors for GitHub issues/PRs
- Map common patterns from issue titles, labels, milestones
- Test event-to-field mapping logic

### Phase 3: CI/CD Integration (Days 7-10)

- Create workflow → field mapping rules
- Implement CI artifact processing
- Link CI signals to project field updates
- Test artifact-to-field mapping logic

### Phase 4: Computed Field Calculation (Days 10-12)

- Implement scoring algorithms (WSJF, True Priority, etc.)
- Create nightly reconciliation to compute derived fields
- Add validation to prevent manual edits to computed fields
- Test calculation accuracy

### Phase 5: Executive Reporting (Days 12-14)

- Create board snapshot generation
- Implement dashboard views
- Set up weekly executive reporting
- Validate reporting accuracy

## Automation & Safety Features

### Safety Mechanisms Built In

1. **DRY_RUN by default**: All operations simulate before executing
2. **MAX_FIX_SCOPE limits**: Prevent runaway automation changes
3. **Schema validation**: All field operations validated against schema first
4. **Computed field protection**: Prevent manual edits to calculated values
5. **Deterministic operations**: Stable ordering and reproducible results
6. **Audit logging**: Complete traceability of all automation decisions

### Automation Triggers

1. **Event-driven**: GitHub events (issues, PRs, labels) trigger field updates
2. **CI-driven**: Workflow completion and artifact availability trigger updates
3. **Time-driven**: Nightly reconciliation fixes drift and recomputes fields

## Integration Patterns

### No Duplication Contract

- **CI/CD stores**: Full evidence content in artifacts
- **Projects store**: Pointers and summary values only
- **Preserves**: Single source of truth while enabling executive visibility

### Evidence Linking Pattern

- CI artifacts produce `stamp.json` with bundle IDs
- Projects store `Evidence Bundle ID` (content address)
- Full evidence remains in CI artifacts and can be retrieved via ID

### Agent Decision Pattern

- Agents set `Human Approval Required` when appropriate
- Human approval precedes auto-merge for sensitive changes
- `Max Fix Scope` limits changes per agent operation

## Validation & Testing

### Unit Testing

- Field mapping logic validation
- CI artifact parsing validation
- Computed field calculation accuracy
- Safety mechanism effectiveness

### Integration Testing

- End-to-end event processing
- CI signal → field update pipeline
- Reconciliation and drift fixing
- Board snapshot accuracy

### Production Validation

- Dry-run validation before live execution
- Small batch validation for early detection
- Gradual rollout with monitoring

## Rollout & Deployment

### Deployment Order

1. Schema and configurations (day 1)
2. Field provisioning (day 2)
3. Event processing (day 3)
4. CI integration (day 4)
5. Computed fields (day 5)
6. Executive reporting (day 6)

### Rollback Plan

- All changes are reversible
- Field creation can be selectively undone
- Automation can be disabled while preserving field data

## Maintenance & Operations

### Daily Operations

- Nightly reconciliation ensures consistency
- Event processing maintains real-time updates
- CI signal processing keeps status current

### Weekly Operations

- Executive snapshot generation
- GA readiness assessment
- Automation effectiveness review

### Monthly Operations

- Policy and field schema review
- Performance optimization
- Process refinement based on usage patterns

## Success Metrics

### Technical Metrics

- Field provisioning success rate (>99%)
- Event processing latency (<5 minutes)
- CI signal processing accuracy (>95%)
- Computed field calculation correctness (>99%)

### Business Metrics

- Reduction in manual governance tasks (>80%)
- Increase in evidence completeness (>90%)
- Executive report generation reliability (>99%)
- Audit preparation time reduction (>70%)

## Stakeholder Impact

### Engineering

- Reduced manual project management overhead
- Clear automation boundaries and safety limits
- Improved evidence and audit trail generation

### Executive Team

- Real-time, evidence-backed readiness metrics
- Predictable reporting cadence
- Clear visibility into blockers and dependencies

### Compliance/Audit

- Automated evidence collection and linking
- Deterministic reporting and audit trails
- Reduced manual compliance overhead

---

**Document Version**: v1.0  
**Implementation Date**: January 15, 2026  
**Owner**: Summit Governance Team  
**Status**: Production Ready
