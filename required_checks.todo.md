## Required checks discovery (one-time)
1) GitHub UI: Repo → Settings → Branches → Branch protection rules → note required checks
2) GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Update: ci/gates/memory_privacy_gates.yml to match exact check names
4) Add PR to rename temporary checks to required names once known

## Candidate Checks for Memory Privacy
- ci/memory-privacy-foundation
- ci/memory-privacy-eval
- ci/memory-privacy-evidence
