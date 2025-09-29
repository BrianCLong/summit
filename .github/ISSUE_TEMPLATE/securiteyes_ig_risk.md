---
name: "Securiteyes IG Risk"
about: Log a security, supply-chain, CI/CD, or counterintelligence risk for Securiteyes IG triage
labels: [area/security, needs-triage]
---

## Summary
Provide a concise description of the suspected risk and affected scope.

## Securiteyes Packet
```yaml
summary: "<plain English outcome>"
risk_score: <0-100>
confidence: <low|med|high>
key_findings:
  - id: KR-001
    evidence: ["<file|log|run-url|hash>"]
    impact: "<who/what is affected>"
    exploit_path: "<text or graph edges>"
recommended_actions:
  - title: "<imperative>"
    change_type: <PR|Policy|Infra|Runbook|Training>
    effort: <S|M|L>
    prereqs: []
    diff_or_patch: |
      # attach minimal diff / OPA rule / workflow step
verification:
  - checks: ["unit:...","policy:...","e2e:..."]
  - success_criteria: "<objective gates/SLOs>"
owners_notified: ["@team/oncall"]
links:
  pr: "<if generated>"
  runbook: "<if generated>"
  dashboards: ["<url>"]
polygraph:
  score: <0-100>
  confidence: <low|med|high>
mode: <angleton|dzerzhinsky>
```

## Additional Context
Attach logs, dashboards, screenshots, runbooks, or other evidence.
