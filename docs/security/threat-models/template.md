# Threat Model: <feature name>

- **Feature:** <feature name>
- **Owner:** <team/owner>
- **Last updated:** <YYYY-MM-DD>
- **Review cadence:** Quarterly (or tighter if high risk)

## Assets
- <data, credentials, workflows, keys>

## Entry points
- <APIs, events, CLI, schedulers, LLM tools/prompts>

## Trust boundaries
- <identity/authorization boundaries, network tiers, tenant isolation points>

## Threats (STRIDE + abuse/misuse)
- <spoofing>
- <tampering>
- <repudiation>
- <information disclosure>
- <denial of service>
- <elevation of privilege>
- <abuse & misuse (LLM/automation)>
- <supply chain & delivery>

## Mitigations
- Map each threat to concrete controls (authZ, rate limits, input validation, signing, monitoring, playbooks).

## Residual risk and follow-ups
- Remaining gaps, compensating controls, runbooks, and planned fixes with owners.
