# Summit Governance System - Operating Procedures

## Overview

This document provides the operational procedures for maintaining the Summit Governance System. It covers the day-to-day operations, maintenance tasks, and escalation procedures.

## Table of Contents
1. [Daily Operations](#daily-operations)
2. [Weekly Operations](#weekly-operations) 
3. [Monthly Operations](#monthly-operations)
4. [Troubleshooting](#troubleshooting)
5. [Escalation Procedures](#escalation-procedures)
6. [Change Control](#change-control)
7. [Auditing](#auditing)

## Daily Operations

### Morning Check (UTC 06:00)

1. **Check automation health**:
   ```bash
   # Check for failed automation runs
   gh run list --workflow="project19-*" --limit=10 --json status,conclusion,event,createdAt
   ```

2. **Verify field states**:
   - Ensure all expected fields exist in Project 19
   - Check for any drift since last reconciliation

3. **Monitor evidence pipelines**:
   - Check for CI workflows that failed to produce evidence artifacts
   - Verify gate dependencies are functioning

### End-of-Day Summary

1. **Review automation reports**:
   - Check `artifacts/project19/` for any errors or anomalies
   - Verify all scheduled runs completed successfully

2. **Update status dashboards**:
   - Ensure executive dashboards reflect current state
   - Document any significant changes in blockers or readiness

## Weekly Operations

### Monday Morning (UTC 06:00)

1. **Board snapshot generation**:
   - Verify the weekly board snapshot was generated automatically
   - Review for accuracy before circulation
   - Upload to `docs/releases/GA_READINESS_WEEKLY/`

2. **Weekly GA Readiness Review (WGRR)**:
   - Conduct the weekly ritual
   - Update any fields that require manual intervention
   - Document decisions and action items

3. **Agent activity review**:
   - Review all agent-initiated changes from the previous week
   - Verify they stayed within defined scope and approval boundaries
   - Update automation eligibility as needed

### Friday Wrap-up

1. **Audit compliance check**:
   - Verify all audit-scope items have required evidence
   - Check for any gaps in external audit preparation
   - Update compliance tracking

2. **Dependency review**:
   - Review and update cross-project dependencies
   - Update the blast radius analysis if significant changes occurred

## Monthly Operations

### Month Start

1. **Policy review**:
   - Verify all policies are still current and accurate
   - Update scoring weights if business priorities have shifted
   - Review field mappings for accuracy

2. **Capacity planning**:
   - Review automation capacity and adjust MAX_FIX_SCOPE as needed
   - Plan any infrastructure changes for increased volume

### Month End

1. **Governance effectiveness review**:
   - Analyze automation effectiveness metrics
   - Review error rates and adjust safety parameters
   - Document lessons learned and improvements

2. **Stakeholder reporting**:
   - Generate monthly governance effectiveness report
   - Share with executives and steering committee
   - Update governance maturity metrics

## Troubleshooting

### Common Issues

#### Field Discrepancies
- **Symptom**: Fields not matching expected schema
- **Diagnosis**: Run `npm run enforce:project19` in report mode
- **Resolution**: Execute with `DRY_RUN=false` if safe, otherwise manual investigation

#### CI Artifact Problems
- **Symptom**: CI status fields not updating
- **Diagnosis**: Check workflow run artifacts are accessible
- **Resolution**: Verify artifact retention settings and workflow permissions

#### Automation Failures
- **Symptom**: Scheduled runs failing consistently
- **Diagnosis**: Check GitHub token permissions and API limits
- **Resolution**: Rotate tokens if expired, adjust permissions as needed

#### Drift Accumulation
- **Symptom**: Increasing number of drift reports
- **Diagnosis**: Investigate whether new patterns are emerging
- **Resolution**: Update policy or adjust automation scope as appropriate

### Recovery Procedures

#### Immediate Response (0-15 minutes)
1. Identify if issue affects GA-critical items
2. Assess scope of impact (individual items vs. systemic)
3. Activate appropriate incident response if GA-blocker

#### Containment (15-60 minutes)
1. Halt affected automation if causing issues
2. Switch to manual governance if necessary
3. Communicate status to stakeholders

#### Resolution (1-24 hours)
1. Apply immediate fixes to restore functionality
2. Implement longer-term preventive measures
3. Verify systems return to normal operation

## Escalation Procedures

### Level 1: Technical Issues
- **Owner**: Automation Maintainer
- **Timing**: Within 4 hours
- **Scope**: Individual automation failures, field discrepancies

### Level 2: Process Issues  
- **Owner**: Release Captain
- **Timing**: Within 24 hours
- **Scope**: Policy violations, audit gaps, significant drift

### Level 3: Business Impact
- **Owner**: Executive Team
- **Timing**: Immediate
- **Scope**: GA blockers, regulatory concerns, customer impact

### Emergency Escalation (Any Time)
- **Conditions**: Security compromise, regulatory violation, GA blockers
- **Process**: Direct escalation to Release Captain + Security Owner
- **Communication**: All stakeholders within 1 hour

## Change Control

### Field Schema Changes
1. **Proposal**: Submit PR to `scripts/config/project19-field-schema.json`
2. **Review**: Security + Compliance + Engineering approval
3. **Testing**: Dry-run on non-production project
4. **Deployment**: Execute with `DRY_RUN=false` during maintenance window
5. **Verification**: Confirm all automation still functions

### Workflow Changes
1. **Proposal**: Submit PR to `.github/workflows/project19-*`
2. **Review**: Engineering + Security review
3. **Testing**: Test changes on fork or in feature branch
4. **Deployment**: Merge to main and verify execution
5. **Monitoring**: Watch for any unexpected behavior

### Policy Changes
1. **Proposal**: Submit PR to policy configuration files
2. **Review**: Engineering + Security + Compliance + Legal (if required)
3. **Impact Assessment**: Determine effect on existing items
4. **Gradual Rollout**: Apply to new items first, then migrate as appropriate
5. **Communication**: Inform all stakeholders of changes

## Auditing

### Weekly Audit Points
- All automation decisions are logged and traceable
- Evidence artifacts are properly referenced
- Manual overrides are documented with rationale
- Agent decisions are reviewed and approved

### Monthly Audit Reports
- Automation effectiveness metrics
- Policy compliance rates
- Error rates and resolutions
- Stakeholder satisfaction metrics

### Annual Governance Review
- Comprehensive policy effectiveness
- Process maturity assessment
- Integration with broader governance frameworks
- Continuous improvement recommendations

## Safety Features

### Rate Limiting
- All API operations respect GitHub rate limits
- Automatic backoff and retry for secondary limits
- Monitoring of API consumption patterns

### Safety Valves
- `DRY_RUN` mode for all potentially destructive operations
- `MAX_FIX_SCOPE` to limit change volume
- Explicit approval required for critical operations

### Rollback Capability
- All changes logged with reversal information
- Backup of previous state where possible
- Clear procedures for rolling back changes

## Training and Knowledge Transfer

### New Team Member Onboarding
1. Complete governance system overview
2. Hands-on training with automation tools
3. Shadow experienced team member during rituals
4. Solo execution with supervision

### Regular Training Updates
- Quarterly refresh on policy changes
- Semi-annual review of escalation procedures
- Annual comprehensive governance training

---

## Emergency Contacts
- **Release Captain**: [contact info]
- **Security Owner**: [contact info]  
- **Engineering Lead**: [contact info]
- **Compliance Owner**: [contact info]

## Revision History
- v1.0 (2026-01-15): Initial operating procedures for GA readiness