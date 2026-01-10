# UX Governance Runbook

## Overview

This runbook describes the procedures for operating the UX Governance System for IntelGraph/Summit platform. The system ensures all UX decisions are consistent, enforceable, and aligned with enterprise requirements.

## System Components

### 1. UX CI Enforcer (`scripts/ux-ci-enforcer.js`)

- Validates all code changes against UX doctrine
- Blocks PRs/commits that violate UX governance
- Runs automatically in CI/CD pipeline

### 2. UX Doctrine Files

- `ux-doctrine.json`: Authoritative UX principles
- `.ux-doctrine.schema.json`: Structure definition

### 3. Governance Orchestrator (`scripts/ux-governance-orchestrator.js`)

- Runs four-agent analysis (Qwen, Gemini, Red Team, Stakeholder)
- Produces decision packages at `ux-governance-report.json`

### 4. PR Template (`.github/PULL_REQUEST_TEMPLATE/ux-governance-check.md`)

- Ensures developers verify UX compliance

## Standard Procedures

### Daily Operations

1. Monitor CI/CD pipeline for UX governance failures
2. Review UX violations and work with teams to resolve
3. Update doctrine as needed based on new requirements

### Running UX Validation

```bash
make ux-governance-check
```

### Performing Complete UX Audit

```bash
make ux-governance-audit
```

### Reviewing UX Governance Report

```bash
make ux-governance-report
```

## Emergency Procedures

### UX Governance System Failure

**Symptoms**: CI/CD pipeline not catching UX violations, developers not following UX standards

**Steps**:

1. Verify the UX CI Enforcer script is functioning: `node scripts/ux-ci-enforcer.js`
2. Check that the UX doctrine file exists and is valid: `cat ux-doctrine.json | jq .`
3. If files are corrupted, restore from recent backup or regenerate using orchestrator
4. If CI/CD integration is broken, check GitHub Actions configuration

### Critical UX Violation Found in Production

**Symptoms**: Critical accessibility, security, or compliance UX issue discovered in production

**Steps**:

1. Immediately run complete UX audit: `make ux-governance-audit`
2. Review generated report to confirm scope of violation
3. Prioritize fixes as P0 in the backlog
4. Create emergency fix PR with proper UX governance compliance
5. Deploy hotfix following standard procedures

### Design System Inconsistency Crisis

**Symptoms**: Multiple teams using different design systems, user confusion, accessibility issues

**Steps**:

1. Run complete UX audit to identify scope: `make ux-governance-audit`
2. Generate current UX doctrine: `cat ux-doctrine.json`
3. Communicate single approved design system to all teams
4. Create migration plan for components using wrong system
5. Update all teams' tooling to enforce correct design system

## Maintenance Procedures

### Weekly UX Governance Review

- Review UX violations from CI/CD pipeline
- Update doctrine based on new requirements or changing needs
- Verify all four agents are providing valid inputs
- Check that Arbiter is resolving conflicts correctly

### Monthly UX Doctrine Refresh

1. Run complete governance audit: `make ux-governance-audit`
2. Review and update canonical issue register
3. Update priorities based on user feedback
4. Verify acceptance criteria are still valid
5. Update the executive summary as needed

### Quarterly Governance System Review

- Audit effectiveness of four-agent system
- Review conflict resolution patterns
- Update integration with CI/CD pipeline
- Verify PR template is being used correctly
- Assess need for governance system improvements

## Integration Points

### CI/CD Pipeline

The UX CI Enforcer runs automatically on all PRs and commits. It validates:

- Accessibility compliance
- Critical action patterns
- Design system consistency
- Information hierarchy
- Trust boundaries

### Development Workflow

Developers must use the UX governance PR template when submitting code changes. This ensures compliance with:

- Core UX principles
- Critical action requirements
- Accessibility standards
- Design system usage

## Troubleshooting

### UX CI Enforcer Fails Unexpectedly

- Check that `ux-doctrine.json` file is valid JSON
- Verify all required dependencies are installed
- Review the specific violations reported
- Check for recent changes to the doctrine file

### Orchestrator Doesn't Complete

- Verify Node.js is available and properly configured
- Check that all necessary files exist
- Review any errors in the script's output
- Ensure the script has proper file system permissions

### False Positives in UX Validation

- Review the specific violations to confirm they're truly false
- Update the validation rules if needed
- Ensure the UX doctrine accurately represents requirements

## Contact Information

For UX governance system issues:

- Primary: UX Governance Team
- Escalation: Chief UX Arbiter
- Emergency: Platform Architect
