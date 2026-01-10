# Agent Risk Feedback

CI surfaces the predictive risk score so agents can self-correct before escalation.

## Standard CI Feedback Format

```
[RISK] score=<value> band=<Low|Medium|High|Critical>
[RISK] factors=<comma-separated reasons>
[RISK] guidance=<actionable hints>
```

## Guidance by Band

- **Low**: Proceed with standard plan. Keep evidence current.
- **Medium**: Add targeted tests around touched modules. Re-run relevant suites.
- **High**: Narrow scope to the declared zone, enable `VERIFICATION_TIER=strong`, and attach a decision artifact under `artifacts/risk-decisions/{pr}.json`.
- **Critical**: Halt auto-merge. Escalate to governance, run full regression/security sweeps, and wait for human approval.

## Agent Acknowledgement

Agents must log acknowledgement of elevated risk in their execution transcript, including the remediation actions taken. The acknowledgement is stored with the risk decision artifact for auditability.
