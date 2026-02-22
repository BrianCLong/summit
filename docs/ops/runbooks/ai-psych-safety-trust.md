# AI Psych Safety Trust Pack Runbook

## Enablement

Set the feature flag to enable the pack:

```
PSYCH_SAFETY_PACK=1
```

## Operational Meaning

| Status | Meaning | Action |
| --- | --- | --- |
| WARN | Risk signal detected | Apply remediation guidance below. |
| PASS | No risk signals detected | Continue monitoring. |

MWS is WARN-only by default; no hard FAIL is emitted.

## Remediation Guidance

| Check ID | Recommended Action |
| --- | --- |
| `ERRCATCH_REWARDED` | Add a review step that explicitly celebrates AI error catches. |
| `DISCLOSURE_PRESENT` | Require AI usage disclosure in the run context metadata. |
| `HUMAN_ONLY_RETRO_PRESENT` | Hold a monthly human-only retro on AI integration. |
| `MISFRAMING_RISK` | Add team-dynamics actions alongside tooling/training items. |

## SLO Assumptions
- Target <1% false WARN rates for initial rollout.
- Maintain deterministic outputs with no timestamps in artifacts.

## Support Escalation
- Escalate to governance when WARN signals persist across two review cycles.
- Capture remediation evidence in the next CI run.
