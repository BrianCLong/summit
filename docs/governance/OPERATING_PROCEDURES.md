# Summit Governance System - Operating Procedures

## Overview

This document provides the operational procedures for maintaining the Summit Governance System. It covers day-to-day operations, maintenance tasks, and escalation procedures.

## Daily Operations

### Morning Check (UTC 06:00)

1. **Check automation health**: Verify all scheduled workflows ran successfully

   ```
   gh run list --workflow="project19-*" --limit=10 --json status,conclusion,event,createdAt
   ```

2. **Verify field states**: Ensure all expected fields exist and are properly configured
3. **Monitor evidence pipelines**: Check for CI workflows that failed to produce expected artifacts

### End-of-Day Summary

1. **Review automation reports**: Check `artifacts/project19/` for any errors or anomalies
2. **Update status dashboards**: Ensure executive dashboards reflect current state
3. **Document significant changes**: Log any policy or field modifications

## Weekly Operations

### Monday Morning (WGRR - Weekly GA Readiness Review)

1. **Board snapshot generation**: Verify the weekly board snapshot was generated automatically
2. **Weekly GA readiness review**: Conduct the ritual with stakeholders
3. **Agent activity review**: Review automation effectiveness from the previous week

### Friday Wrap-up

1. **Audit compliance check**: Verify all audit-scope items have required evidence
2. **Dependency review**: Update cross-project dependencies if needed
3. **Policy effectiveness review**: Assess if current policies are producing desired outcomes

## Monthly Operations

### Month Start

1. **Policy review**: Verify all policies are current and accurate
2. **Capacity planning**: Adjust automation limits based on projected volume

### Month End

1. **Governance effectiveness review**: Analyze automation effectiveness and error rates
2. **Stakeholder reporting**: Generate monthly governance effectiveness report

## Troubleshooting

### Common Issues

- **Field Discrepancies**: Run `npm run enforce:project19 -- --mode=report` to identify drift
- **CI Integration Problems**: Check artifact accessibility and retention settings
- **Automation Failures**: Verify GitHub token permissions and API limits
- **Drift Accumulation**: Investigate if new patterns are causing unexpected behavior

### Recovery Procedures

1. **Immediate Response (0-15 minutes)**
   - Identify if issue affects GA-critical items
   - Assess scope of impact
   - Activate appropriate incident response if GA-blocker

2. **Containment (15-60 minutes)**
   - Halt affected automation if causing problems
   - Switch to manual governance if necessary
   - Communicate status to stakeholders

3. **Resolution (1-24 hours)**
   - Apply immediate fixes to restore functionality
   - Implement longer-term preventive measures
   - Verify systems return to normal operation

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

1. Submit PR to `scripts/config/project19-field-schema.json`
2. Engineering + Security + Compliance + Legal (if applicable) approval
3. Test changes on non-production project
4. Execute with `DRY_RUN=false` during maintenance window
5. Verify all automation still functions

### Workflow Changes

1. Submit PR to `.github/workflows/project19-*`
2. Engineering + Security review
3. Test changes in feature branch
4. Merge to main and verify execution
5. Monitor for unexpected behavior

### Policy Changes

1. Update policy configuration files with versioning
2. Impact assessment of existing items
3. Gradual rollout (new items first, then migrate as appropriate)
4. Documentation update with clear change log

## Auditing

### Weekly Audit Points

- All automation decisions are logged and traceable
- Evidence artifacts properly referenced via bundle IDs
- Manual overrides documented with rationale
- Agent decisions reviewed and approved where required

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

- DRY_RUN mode for all potentially destructive operations
- MAX_FIX_SCOPE to limit change volume per run
- Explicit approval required for critical operations
- Rollback capability for all changes

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

## Emergency Contacts

- **Release Captain**: [contact info]
- **Security Owner**: [contact info]
- **Engineering Lead**: [contact info]
- **Compliance Owner**: [contact info]

## Revision History

- v1.0 (2026-01-15): Initial operating procedures for GA readiness
