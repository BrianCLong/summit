## Securiteyes IG Summary
```yaml
summary: "<what this PR changes to reduce risk>"
risk_score: <0-100>  # after-mitigation estimate
confidence: <low|med|high>
key_findings:
  - id: ""
    evidence: []
    impact: ""
recommended_actions:
  - title: ""
    change_type: PR
    effort: S
verification:
  - checks: ["ci:policy","ci:provenance","ci:secrets","tests:unit","tests:e2e"]
  - success_criteria: "all gates pass; error budget unaffected"
owners_notified: ["@security","@oncall"]
links:
  runbook: ""
  dashboards: []
polygraph:
  score: <0-100>
  confidence: <low|med|high>
mode: <angleton|dzerzhinsky>
```

### Checklists
- [ ] SBOM updated / advisories diffed
- [ ] Cosign provenance verified (SLSA-aligned)
- [ ] Secrets scan clean (tests added to prevent regression)
- [ ] OPA policy/unit tests added or updated
- [ ] Rollback plan documented

### Notes for Reviewers
Provide context, diagrams, or rationale that will help reviewers and Securiteyes IG.
