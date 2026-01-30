# People Thrive Incident Runbook

This runbook guides the triage and resolution of behavioral incidents (toxic behavior, bias, microaggressions).

## Triage Process

1. **Initial Review**: Review report for immediate safety concerns.
2. **Redaction**: Ensure all PII is removed from the case record before it enters the tracking system.
3. **Categorization**:
   - **Coaching Opportunity**: Minor friction or misunderstanding.
   - **Policy Violation**: Clear breach of behavior standards.
   - **Severe/Escalation**: Serious harm or legal risk.

## Fairness & Consistency Checklist

- [ ] Has the individual been given a chance to provide their perspective?
- [ ] Are we applying the standard response defined in `behavior_standards.yml`?
- [ ] Is the resolution proportional to the severity?
- [ ] Have we checked for similar past incidents to ensure consistency?

## States and Transitions

Follow the [Incident Workflow](../../policies/people_thrive/incident_workflow.yml).

- **reported** -> **triaged** (within 24 hours)
- **triaged** -> **investigating** / **coaching**
- **investigating** -> **resolved** (aim for 5-10 business days)

## Escalation Matrix

| Severity | Target Owner   | Escalation Path |
| -------- | -------------- | --------------- |
| Low      | Manager        | People Steward  |
| Medium   | People Steward | Head of People  |
| High     | Head of People | Legal / CEO     |

## Metrics Logging

At resolution, update `evidence/people_thrive/metrics.json` (anonymized counts only).
