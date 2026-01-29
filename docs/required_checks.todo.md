## Required checks discovery (Summit)
1) GitHub UI: Settings → Branches → Branch protection rules → note required status checks
2) CLI/API: gh api repos/<org>/<repo>/branches/<branch>/protection
3) Record names below and replace temporary gate names:
   - ci/evidence_schema_check -> <REAL_NAME>
   - ci/governance_explainability_gate -> <REAL_NAME>
   - ci/dependency_delta_gate -> <REAL_NAME>
