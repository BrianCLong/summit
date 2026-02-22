# Required Checks Discovery (Temporary)

Status: Intentionally constrained pending repository-required-checks inspection.

## Goal
Map temporary gate names to the repository's required checks and update workflow/job names
accordingly.

## Steps
1. GitHub UI
   - Navigate to Settings → Branches → Branch protection rules.
   - Record the exact names of required status checks for the default branch.
2. GitHub API (optional, scripted)
   - Use `gh api repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`.
   - Capture the `contexts` list for required check names.
3. Compare required checks against temporary gates:
   - gate/evidence-schema
   - gate/agent-policy
   - gate/concierge-safety
4. Rename workflow jobs (or add aliases) so required check names match.
5. Update this file with the final mapping and delete the temporary gate list.

## Output
- Evidence of required check names (screenshot or API payload).
- Updated workflow/job names if mismatched.
