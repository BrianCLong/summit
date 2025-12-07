# Incident Handling Checklist

## Triage Phase
- [ ] **Acknowledge:** Confirm receipt of alert/report.
- [ ] **Assess:** Determine user impact and scope.
- [ ] **Declare:** Set Severity Level (SEV-1 to SEV-4).
- [ ] **Create War Room:** Spin up the dedicated channel/dashboard.
- [ ] **Assign Roles:** Identify IC, Scribe, and Comms.

## Investigation Phase
- [ ] **Context Gathering:** Check recent deployments and changelogs.
- [ ] **Communicate (Internal):** Update stakeholders every 30m (SEV-1) or 60m (SEV-2).
- [ ] **Communicate (External):** Post initial "Investigating" status if users are affected.
- [ ] **Hypothesize:** Formulate theories on root cause.
- [ ] **Validate:** Test hypotheses safely (check logs, metrics).

## Mitigation Phase
- [ ] **Plan:** Propose a mitigation strategy (rollback, failover, config change).
- [ ] **Approve:** IC gives the green light.
- [ ] **Execute:** Apply the fix.
- [ ] **Verify:** Confirm system health indicators are recovering.

## Resolution Phase
- [ ] **Monitor:** Watch for regression for at least 30 mins.
- [ ] **Downgrade:** Lower severity if stable.
- [ ] **Resolve:** Mark incident as Resolved.
- [ ] **Communicate:** Send final "Resolved" update to all stakeholders.

## Post-Incident Phase
- [ ] **Archive:** Save War Room logs and evidence.
- [ ] **Draft Postmortem:** Create document using the standard template within 24h (SEV-1) or 48h (SEV-2).
- [ ] **Review:** Hold a blame-free postmortem review meeting.
- [ ] **Action Items:** File tickets for all remediation tasks.
