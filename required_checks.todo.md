# Required checks discovery (TODO)

1. Open repo Settings → Branches → Branch protection rules.
2. Record exact required check names (case-sensitive).
3. Add them to: .github/workflows/ci.required-checks.md (to be created in PR5).
4. Temporary naming convention until discovered:
   - summit-fastgen-evidence
   - summit-fastgen-governance
   - summit-fastgen-evals
     Rename plan: once true names known, add PR to align workflow/job names.
